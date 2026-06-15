import mongoose from "mongoose";

import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";
import {
  createBadRequestError,
  createForbiddenError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { endSessionSafely } from "../../../utils/common/mongoose.js";
import {
  EVALUATION_STAGES,
} from "../../decisionPlugins/evaluations/evaluationStages.js";
import { ISSUE_STAGES } from "../shared/issueStages.js";
import { getEvaluationStructureOrThrow } from "../../decisionPlugins/evaluations/evaluationStructureRegistry.js";
import { resolveEvaluationComputeLifecycle } from "./resolveEvaluationComputeLifecycle.js";
import {
  executeAlternativeEvaluationModel,
  executeCriteriaWeightingModel,
} from "../modelExecution/index.js";
import { buildEvaluationStructureContext } from "../evaluations/buildEvaluationStructureContext.js";
import { getOrderedAlternativeAndCriterionNames } from "../evaluations/evaluationStructureData.js";
import { getOrderedCriterionNames } from "../evaluations/criteriaWeightingStructureData.js";
import { hasOwnKey, isPlainObject } from "../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const getStructureForIssueStage = ({ issue, stage }) => {
  const structureKeyByStage = {
    [EVALUATION_STAGES.CRITERIA_WEIGHTING]:
      issue.criteriaWeightingStructureKey,
    [EVALUATION_STAGES.ALTERNATIVE_EVALUATION]:
      issue.alternativeEvaluationStructureKey,
  };

  return getEvaluationStructureOrThrow(structureKeyByStage[stage]);
};

const loadComputeContext = async ({ issueId, userId, stage }) => {
  const issue = await getIssueByIdOrThrow(issueId, { lean: false });

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError("Only issue admin can compute evaluation stages", {
      field: "userId",
    });
  }

  const expectedCurrentStage =
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
      ? ISSUE_STAGES.WEIGHTS_FINISHED
      : stage;

  if (issue.currentStage !== expectedCurrentStage) {
    throw createBadRequestError(
      `Issue is not currently ready to compute '${stage}'`,
      {
        code: "ISSUE_STAGE_NOT_READY_TO_COMPUTE",
        field: "stage",
        details: {
          currentStage: issue.currentStage,
          requestedStage: stage,
        },
      }
    );
  }

  return {
    issue,
    structure: getStructureForIssueStage({ issue, stage }),
  };
};

const loadParticipationsForCompute = async ({ issueId, stage }) => {
  const participations = await Participation.find({
    issue: issueId,
  });

  const pendingParticipations = participations.filter(
    (participation) => participation.invitationStatus === "pending"
  );
  if (pendingParticipations.length > 0) {
    throw createBadRequestError(
      "Pending invitations block stage compute",
      {
        code: "PENDING_INVITATIONS_BLOCK_STAGE_COMPUTE",
        field: "stage",
        details: {
          stage,
          pendingExpertIds: pendingParticipations.map((participation) =>
            toIdString(participation.expert)
          ),
        },
      }
    );
  }

  const acceptedParticipations = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );

  if (acceptedParticipations.length === 0) {
    throw createBadRequestError(
      "Issue has no accepted participations for expert evaluations",
      {
        code: "NO_ACCEPTED_PARTICIPATIONS",
        field: "issueId",
      }
    );
  }

  const incompleteAcceptedParticipations = acceptedParticipations.filter(
    (participation) => {
      if (stage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
        return participation.weightsCompleted !== true;
      }

      return participation.evaluationCompleted !== true;
    }
  );

  if (incompleteAcceptedParticipations.length > 0) {
    throw createBadRequestError(
      "Not all accepted experts have completed the requested evaluation stage",
      {
        code: "EVALUATION_STAGE_NOT_COMPLETED_BY_ALL_EXPERTS",
        field: "stage",
        details: {
          stage,
          pendingExpertIds: incompleteAcceptedParticipations.map((participation) =>
            toIdString(participation.expert)
          ),
        },
      }
    );
  }

  return acceptedParticipations;
};

const loadEvaluationsForCompute = async ({
  issueId,
  stage,
  consensusPhase,
  participations,
}) => {
  const evaluations = await IssueEvaluation.find({
    issue: issueId,
    stage,
    consensusPhase,
    completed: true,
  }).populate("expert", "name email");

  const expectedExperts = new Set(
    participations.map((participation) => toIdString(participation.expert))
  );

  const completedExperts = new Set(
    evaluations.map((evaluation) =>
      toIdString(evaluation.expert._id || evaluation.expert)
    )
  );

  const missingExperts = [...expectedExperts].filter(
    (expertId) => !completedExperts.has(expertId)
  );

  if (
    evaluations.length !== participations.length ||
    missingExperts.length > 0
  ) {
    throw createBadRequestError(
      "Completed evaluation documents are missing for the requested stage",
      {
        code: "COMPLETED_EVALUATIONS_MISSING",
        field: "stage",
      }
    );
  }

  return evaluations;
};

const resetAlternativeRoundCompletion = async (issueId, session = null) => {
  await Participation.updateMany(
    {
      issue: issueId,
      invitationStatus: "accepted",
    },
    {
      $set: {
        evaluationCompleted: false,
      },
    },
    {
      session,
    }
  );
};

const withConsensusLifecycleInModelExecution = ({
  modelExecution,
  consensusLifecycle,
}) => {
  if (!isPlainObject(modelExecution)) {
    throw createInternalError("Compute result modelExecution must be an object", {
      field: "computeResult.modelExecution",
    });
  }

  const normalizedModelExecution = { ...modelExecution };

  if (consensusLifecycle === null || consensusLifecycle === undefined) {
    return normalizedModelExecution;
  }

  return {
    ...normalizedModelExecution,
    consensusLifecycle,
  };
};

const normalizeCriteriaWeightingComputeResultOrThrow = async ({
  issue,
  computeResult,
}) => {
  if (!isPlainObject(computeResult)) {
    throw createBadRequestError(
      "Criteria weighting compute result must be an object",
      {
        field: "computeResult",
      }
    );
  }

  const allowedFields = new Set([
    "message",
    "consensusMeasure",
    "weightsByCriterion",
    "collectiveEvaluations",
    "modelExecution",
    "rawOutput",
  ]);
  const unexpectedField = Object.keys(computeResult).find(
    (field) => !allowedFields.has(field)
  );
  if (unexpectedField) {
    throw createBadRequestError(
      `Criteria weighting compute result contains unexpected field '${unexpectedField}'`,
      {
        field: `computeResult.${unexpectedField}`,
      }
    );
  }

  const message = normalizeNonEmptyString(computeResult.message);
  if (!message) {
    throw createBadRequestError(
      "Criteria weighting compute result message is required",
      {
        field: "computeResult.message",
      }
    );
  }

  const consensusMeasure = computeResult.consensusMeasure;
  if (consensusMeasure !== null && !isFiniteNumber(consensusMeasure)) {
    throw createBadRequestError(
      "Criteria weighting consensusMeasure must be a finite number or null",
      {
        field: "computeResult.consensusMeasure",
      }
    );
  }

  if (!isPlainObject(computeResult.weightsByCriterion)) {
    throw createBadRequestError(
      "Criteria weighting compute result weightsByCriterion must be an object",
      {
        field: "computeResult.weightsByCriterion",
      }
    );
  }

  if (!isPlainObject(computeResult.collectiveEvaluations)) {
    throw createBadRequestError(
      "Criteria weighting compute result collectiveEvaluations must be an object",
      {
        field: "computeResult.collectiveEvaluations",
      }
    );
  }

  if (!isPlainObject(computeResult.modelExecution)) {
    throw createBadRequestError(
      "Criteria weighting compute result modelExecution must be an object",
      {
        field: "computeResult.modelExecution",
      }
    );
  }

  if (!isPlainObject(computeResult.rawOutput)) {
    throw createBadRequestError(
      "Criteria weighting compute result rawOutput must be an object",
      {
        field: "computeResult.rawOutput",
      }
    );
  }

  const { criterionNames } = await getOrderedCriterionNames({ issue });
  const normalizedWeightsByCriterion = {};
  const orderedWeights = criterionNames.map((criterionName) => {
    if (!hasOwnKey(computeResult.weightsByCriterion, criterionName)) {
      throw createBadRequestError(
        `Criteria weighting compute result is missing weight for criterion '${criterionName}'`,
        {
          field: `computeResult.weightsByCriterion.${criterionName}`,
        }
      );
    }

    const weight = Number(computeResult.weightsByCriterion[criterionName]);
    if (!Number.isFinite(weight)) {
      throw createBadRequestError(
        `Criteria weighting compute result weight for criterion '${criterionName}' must be finite`,
        {
          field: `computeResult.weightsByCriterion.${criterionName}`,
        }
      );
    }

    normalizedWeightsByCriterion[criterionName] = weight;
    return weight;
  });

  return {
    message,
    consensusMeasure: consensusMeasure ?? null,
    weightsByCriterion: normalizedWeightsByCriterion,
    collectiveEvaluations: computeResult.collectiveEvaluations,
    modelExecution: computeResult.modelExecution,
    rawOutput: computeResult.rawOutput,
    orderedWeights,
  };
};

const mapCriteriaWeightingResultToStageResult = (computeResult) => ({
  consensusMeasure: computeResult.consensusMeasure,
  collectiveEvaluations: computeResult.collectiveEvaluations,
  modelExecution: computeResult.modelExecution,
  rawOutput: computeResult.rawOutput,
});

const applyCriteriaWeightingIssueUpdates = async ({
  issue,
  orderedWeights,
  session = null,
}) => {
  if (!isPlainObject(issue.modelParameters)) {
    throw createInternalError("Issue modelParameters must be an object", {
      field: "issue.modelParameters",
      details: {
        issueId: issue?._id ?? null,
      },
    });
  }

  const modelParameters = { ...issue.modelParameters };

  issue.modelParameters = {
    ...modelParameters,
    weights: orderedWeights,
  };
  issue.currentStage = ISSUE_STAGES.ALTERNATIVE_EVALUATION;
  await issue.save({ session });
};

const saveStageResult = async ({
  issue,
  stage,
  computeResult,
  lifecycleMetadata = null,
  consensusPhase = issue.consensusPhase,
  session = null,
}) => {
  let stageResultPayload = null;

  if (stage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    stageResultPayload = {
      consensusMeasure: computeResult.consensusMeasure,
      rankedAlternatives: [],
      collectiveEvaluations: computeResult.collectiveEvaluations,
      plotsGraphic: {},
      modelExecution: withConsensusLifecycleInModelExecution({
        modelExecution: computeResult.modelExecution,
        consensusLifecycle: lifecycleMetadata,
      }),
      rawOutput: computeResult.rawOutput,
    };
  } else if (stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    if (!Array.isArray(computeResult.rankedAlternatives)) {
      throw createInternalError(
        "Alternative evaluation compute result rankedAlternatives must be an array",
        {
          field: "computeResult.rankedAlternatives",
          details: {
            issueId: issue?._id ?? null,
            stage,
          },
        }
      );
    }

    if (!isPlainObject(computeResult.plotsGraphic)) {
      throw createInternalError(
        "Alternative evaluation compute result plotsGraphic must be an object",
        {
          field: "computeResult.plotsGraphic",
          details: {
            issueId: issue?._id ?? null,
            stage,
          },
        }
      );
    }

    stageResultPayload = {
      consensusMeasure: computeResult.consensusMeasure,
      rankedAlternatives: computeResult.rankedAlternatives,
      collectiveEvaluations: computeResult.collectiveEvaluations,
      plotsGraphic: computeResult.plotsGraphic,
      modelExecution: withConsensusLifecycleInModelExecution({
        modelExecution: computeResult.modelExecution,
        consensusLifecycle: lifecycleMetadata,
      }),
      rawOutput: computeResult.rawOutput,
    };
  } else {
    throw createInternalError("Unsupported evaluation stage for stage result persistence", {
      field: "stage",
      details: {
        issueId: issue?._id ?? null,
        stage,
      },
    });
  }

  await IssueStageResult.findOneAndUpdate(
    {
      issue: issue._id,
      stage,
      consensusPhase,
    },
    {
      $set: stageResultPayload,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      session,
    }
  );
};

const applyComputeIssueUpdates = async ({
  issue,
  computeResult,
  session = null,
}) => {
  const issueUpdateEntries = Object.entries(computeResult.issueUpdates);
  let didSetFinishedAt = false;

  for (const [key, value] of issueUpdateEntries) {
    issue[key] = value;
  }

  if (computeResult.nextCurrentStage !== null) {
    issue.currentStage = computeResult.nextCurrentStage;
  }

  if (
    issue.currentStage === ISSUE_STAGES.FINISHED &&
    issue.active === false &&
    !issue.finishedAt
  ) {
    issue.finishedAt = new Date();
    didSetFinishedAt = true;
  }

  if (
    issueUpdateEntries.length > 0 ||
    computeResult.nextCurrentStage !== null ||
    didSetFinishedAt
  ) {
    await issue.save({ session });
  }
};

const persistComputedStageInTransaction = async ({
  session = null,
  persist,
}) => {
  if (session) {
    return persist(session);
  }

  const transactionSession = await mongoose.startSession();

  try {
    let persistResult = null;

    await transactionSession.withTransaction(async () => {
      persistResult = await persist(transactionSession);
    });

    return persistResult;
  } finally {
    await endSessionSafely(transactionSession);
  }
};

const computeCriteriaWeightingStage = async ({
  structure,
  issue,
  evaluations,
  apiModelsBaseUrl,
  httpClient,
}) => {
  if (typeof structure?.validateBeforeCompute === "function") {
    await structure.validateBeforeCompute({
      issue,
      evaluations,
      phase: issue.consensusPhase,
    });
  }

  return executeCriteriaWeightingModel({
    issue,
    structure,
    structureKey: structure.key,
    evaluations,
    phase: issue.consensusPhase,
    apiModelsBaseUrl,
    httpClient,
  });
};

const computeAlternativeEvaluationStage = async ({
  structure,
  issue,
  evaluations,
  phase = issue.consensusPhase,
  apiModelsBaseUrl,
  httpClient,
}) => {
  const evaluationStructureData =
    typeof structure?.validateBeforeCompute === "function"
      ? await getOrderedAlternativeAndCriterionNames({ issue })
      : null;

  if (typeof structure?.validateBeforeCompute === "function") {
    await structure.validateBeforeCompute({
      issue,
      evaluations,
      phase,
      ...evaluationStructureData,
    });
  }

  return executeAlternativeEvaluationModel({
    issue,
    structureKey: structure.key,
    evaluations,
    phase,
    apiModelsBaseUrl,
    httpClient,
    message:
      issue.isConsensus === true
        ? `Consensus round ${phase} for '${issue.name}' computed successfully.`
        : `Issue '${issue.name}' computed successfully.`,
    issueUpdates:
      issue.isConsensus === true
        ? {}
        : { active: false },
    nextCurrentStage:
      issue.isConsensus === true ? null : ISSUE_STAGES.FINISHED,
  });
};

const ensureSimulatedConsensusIssueConfigOrThrow = ({ issue, stage }) => {
  if (stage !== EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    return;
  }

  if (issue?.simulateConsensus !== true) {
    return;
  }

  if (issue?.isConsensus !== true) {
    throw createBadRequestError(
      "simulateConsensus requires isConsensus to be true",
      {
        code: "SIMULATION_REQUIRES_CONSENSUS_ISSUE",
        field: "simulateConsensus",
      }
    );
  }

  if (!Number.isFinite(issue?.consensusThreshold)) {
    throw createInternalError("Issue consensusThreshold is invalid", {
      field: "consensusThreshold",
      details: {
        issueId: issue?._id ?? null,
        consensusThreshold: issue?.consensusThreshold ?? null,
      },
    });
  }

  if (!Number.isInteger(issue?.consensusMaxPhases) || issue.consensusMaxPhases <= 0) {
    throw createInternalError(
      "Simulated consensus requires a valid positive consensusMaxPhases",
      {
        field: "consensusMaxPhases",
        details: {
          issueId: issue?._id ?? null,
          consensusMaxPhases: issue?.consensusMaxPhases ?? null,
        },
      }
    );
  }

  if (
    !Number.isInteger(issue?.consensusPhase) ||
    issue.consensusPhase < 1
  ) {
    throw createInternalError("Issue consensusPhase is invalid", {
      field: "consensusPhase",
      details: {
        issueId: issue?._id ?? null,
        consensusPhase: issue?.consensusPhase ?? null,
      },
    });
  }
};

const getSuggestedEvaluationsOrThrow = (rawOutput) => {
  if (!isPlainObject(rawOutput)) {
    throw createInternalError("Model rawOutput is missing for simulated consensus", {
      field: "rawOutput",
    });
  }

  const suggestions = rawOutput.suggested_next_evaluations;
  if (!isPlainObject(suggestions)) {
    throw createInternalError(
      "Model rawOutput.suggested_next_evaluations is required for simulated consensus rounds",
      {
        field: "rawOutput.suggested_next_evaluations",
      }
    );
  }

  if (Object.keys(suggestions).length === 0) {
    throw createInternalError(
      "Model rawOutput.suggested_next_evaluations cannot be empty when consensus is not reached",
      {
        field: "rawOutput.suggested_next_evaluations",
      }
    );
  }

  return suggestions;
};

const extractSuggestedEvaluationPayloadOrThrow = ({
  expertId,
  expertSuggestion,
}) => {
  if (!isPlainObject(expertSuggestion)) {
    throw createInternalError(
      `Suggested evaluation payload for expert '${expertId}' must be an object`,
      {
        field: `rawOutput.suggested_next_evaluations.${expertId}.payload`,
      }
    );
  }

  if (!isPlainObject(expertSuggestion.payload)) {
    throw createInternalError(
      `Suggested evaluation payload for expert '${expertId}' must be an object`,
      {
        field: `rawOutput.suggested_next_evaluations.${expertId}.payload`,
      }
    );
  }

  return expertSuggestion.payload;
};

const saveSimulatedEvaluationsForNextPhaseOrThrow = async ({
  issue,
  structure,
  acceptedParticipations,
  suggestions,
  nextPhase,
  session = null,
}) => {
  const expectedExpertIds = acceptedParticipations.map((participation) =>
    toIdString(participation.expert)
  );

  const suggestedExpertIds = Object.keys(suggestions);
  const missingExpertIds = expectedExpertIds.filter(
    (expertId) => !suggestedExpertIds.includes(expertId)
  );
  const unexpectedExpertIds = suggestedExpertIds.filter(
    (expertId) => !expectedExpertIds.includes(expertId)
  );

  if (missingExpertIds.length > 0 || unexpectedExpertIds.length > 0) {
    throw createInternalError(
      "Suggested next evaluations do not match accepted experts",
      {
        field: "rawOutput.suggested_next_evaluations",
        details: {
          missingExpertIds,
          unexpectedExpertIds,
        },
      }
    );
  }

  for (const participation of acceptedParticipations) {
    const expertId = toIdString(participation.expert);
    const expertSuggestion = suggestions[expertId];
    const suggestedPayload = extractSuggestedEvaluationPayloadOrThrow({
      expertId,
      expertSuggestion,
    });
    const evaluationContext = await buildEvaluationStructureContext({
      issue,
      structure,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      consensusPhase: nextPhase,
    });

    const normalizedPayload = await structure.save({
      mode: "submit",
      payload: suggestedPayload,
      evaluationContext,
    });

    await IssueEvaluation.findOneAndUpdate(
      {
        issue: issue._id,
        expert: participation.expert,
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        consensusPhase: nextPhase,
      },
      {
        $set: {
          payload: normalizedPayload,
          completed: true,
          submittedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        session,
      }
    );
  }
};

const buildIssueSnapshotForConsensusLifecycle = ({ issue, consensusPhase }) => ({
  _id: issue._id,
  isConsensus: issue.isConsensus,
  consensusThreshold: issue.consensusThreshold,
  consensusMaxPhases: issue.consensusMaxPhases,
  consensusPhase,
});

const computeSimulatedAlternativeConsensusRounds = async ({
  structure,
  issue,
  acceptedParticipations,
  evaluations,
  apiModelsBaseUrl,
  httpClient,
  session = null,
}) => {
  ensureSimulatedConsensusIssueConfigOrThrow({
    issue,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  });

  const initialPhase = issue.consensusPhase;
  let currentPhase = initialPhase;
  let currentEvaluations = evaluations;
  let lastLifecycleMetadata = null;
  let lastComputeResult = null;

  while (true) {
    const phaseComputeResult = await computeAlternativeEvaluationStage({
      structure,
      issue,
      evaluations: currentEvaluations,
      phase: currentPhase,
      apiModelsBaseUrl,
      httpClient,
    });

    const {
      computeResult: lifecycleComputeResult,
      lifecycleMetadata,
    } = resolveEvaluationComputeLifecycle({
      issue: buildIssueSnapshotForConsensusLifecycle({
        issue,
        consensusPhase: currentPhase,
      }),
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      computeResult: phaseComputeResult,
    });

    await saveStageResult({
      issue,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      computeResult: lifecycleComputeResult,
      lifecycleMetadata,
      consensusPhase: currentPhase,
      session,
    });

    lastComputeResult = lifecycleComputeResult;
    lastLifecycleMetadata = lifecycleMetadata;

    if (lifecycleMetadata.consensusReached || lifecycleMetadata.maxPhasesReached) {
      break;
    }

    const suggestions = getSuggestedEvaluationsOrThrow(
      lifecycleComputeResult.rawOutput
    );
    const nextPhase = currentPhase + 1;

    await saveSimulatedEvaluationsForNextPhaseOrThrow({
      issue,
      structure,
      acceptedParticipations,
      suggestions,
      nextPhase,
      session,
    });

    currentPhase = nextPhase;
    issue.consensusPhase = currentPhase;
    await issue.save({ session });

    currentEvaluations = await loadEvaluationsForCompute({
      issueId: issue._id,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      consensusPhase: currentPhase,
      participations: acceptedParticipations,
    });
  }

  issue.consensusPhase = currentPhase;
  issue.currentStage = ISSUE_STAGES.FINISHED;
  issue.active = false;
  if (!issue.finishedAt) {
    issue.finishedAt = new Date();
  }
  await issue.save({ session });

  return {
    message: "Simulated consensus rounds computed successfully.",
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    structureKey: structure.key,
    consensusPhase: currentPhase,
    currentStage: issue.currentStage,
    result: {
      rankedAlternatives: lastComputeResult.rankedAlternatives,
      collectiveEvaluations: lastComputeResult.collectiveEvaluations,
      plotsGraphic: lastComputeResult.plotsGraphic,
      consensusMeasure: lastComputeResult.consensusMeasure,
      consensusLifecycle: lastLifecycleMetadata,
      modelExecution: lastComputeResult.modelExecution,
      rawOutput: lastComputeResult.rawOutput,
      simulatedConsensus: {
        enabled: true,
        initialPhase,
        finalPhase: currentPhase,
        roundsComputed: currentPhase - initialPhase + 1,
        consensusReached: lastLifecycleMetadata?.consensusReached === true,
        maxPhasesReached: lastLifecycleMetadata?.maxPhasesReached === true,
        finalizationReason: lastLifecycleMetadata?.finalizationReason ?? null,
      },
    },
  };
};

export const computeIssueEvaluationStage = async ({
  issueId,
  userId,
  stage,
  apiModelsBaseUrl,
  httpClient,
  session = null,
}) => {
  const { issue, structure } = await loadComputeContext({
    issueId,
    userId,
    stage,
  });

  const participations = await loadParticipationsForCompute({
    issueId: issue._id,
    stage,
  });

  const evaluations = await loadEvaluationsForCompute({
    issueId: issue._id,
    stage,
    consensusPhase: issue.consensusPhase,
    participations,
  });

  ensureSimulatedConsensusIssueConfigOrThrow({ issue, stage });

  if (
    stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION &&
    issue.simulateConsensus === true
  ) {
    return computeSimulatedAlternativeConsensusRounds({
      structure,
      issue,
      acceptedParticipations: participations,
      evaluations,
      apiModelsBaseUrl,
      httpClient,
      session,
    });
  }

  const computeResult =
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
      ? await computeCriteriaWeightingStage({
        structure,
        issue,
        evaluations,
        apiModelsBaseUrl,
        httpClient,
      })
      : await computeAlternativeEvaluationStage({
        structure,
        issue,
        evaluations,
        apiModelsBaseUrl,
        httpClient,
      });

  if (stage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    const normalizedCriteriaWeightingResult =
      await normalizeCriteriaWeightingComputeResultOrThrow({
        issue,
        computeResult,
      });

    await persistComputedStageInTransaction({
      session,
      persist: async (persistSession) => {
        await saveStageResult({
          issue,
          stage,
          computeResult: mapCriteriaWeightingResultToStageResult(
            normalizedCriteriaWeightingResult
          ),
          lifecycleMetadata: null,
          session: persistSession,
        });

        await applyCriteriaWeightingIssueUpdates({
          issue,
          orderedWeights: normalizedCriteriaWeightingResult.orderedWeights,
          session: persistSession,
        });
      },
    });

    return {
      message: normalizedCriteriaWeightingResult.message,
      stage,
      structureKey: structure.key,
      consensusPhase: issue.consensusPhase,
      currentStage: issue.currentStage,
      result: {
        weightsByCriterion: normalizedCriteriaWeightingResult.weightsByCriterion,
        collectiveEvaluations: normalizedCriteriaWeightingResult.collectiveEvaluations,
        consensusMeasure: normalizedCriteriaWeightingResult.consensusMeasure,
        modelExecution: normalizedCriteriaWeightingResult.modelExecution,
        rawOutput: normalizedCriteriaWeightingResult.rawOutput,
      },
    };
  }

  const {
    computeResult: lifecycleComputeResult,
    lifecycleMetadata,
    resetAlternativeEvaluationCompletion,
  } = resolveEvaluationComputeLifecycle({
    issue,
    stage,
    computeResult,
  });

  await persistComputedStageInTransaction({
    session,
    persist: async (persistSession) => {
      await saveStageResult({
        issue,
        stage,
        computeResult: lifecycleComputeResult,
        lifecycleMetadata,
        session: persistSession,
      });

      await applyComputeIssueUpdates({
        issue,
        computeResult: lifecycleComputeResult,
        session: persistSession,
      });

      if (resetAlternativeEvaluationCompletion) {
        await resetAlternativeRoundCompletion(issue._id, persistSession);
      }
    },
  });

  return {
    message: lifecycleComputeResult.message,
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    currentStage: issue.currentStage,
    result: {
      rankedAlternatives: lifecycleComputeResult.rankedAlternatives,
      collectiveEvaluations: lifecycleComputeResult.collectiveEvaluations,
      plotsGraphic: lifecycleComputeResult.plotsGraphic,
      consensusMeasure: lifecycleComputeResult.consensusMeasure,
      consensusLifecycle: lifecycleMetadata ?? null,
      modelExecution: lifecycleComputeResult.modelExecution,
      rawOutput: lifecycleComputeResult.rawOutput,
    },
  };
};
