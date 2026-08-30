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
  EVALUATION_STAGE_VALUES,
} from "../../decisionPlugins/evaluations/evaluationStages.js";
import { ISSUE_STAGES } from "../shared/issueStages.js";
import { getEvaluationStructureOrThrow } from "../../decisionPlugins/evaluations/evaluationStructureRegistry.js";
import { resolveEvaluationComputeLifecycle } from "./resolveEvaluationComputeLifecycle.js";
import { formatConsensusRoundLabel } from "../shared/formatConsensusRoundLabel.js";
import {
  executeAlternativeEvaluationModel,
  executeCriteriaWeightingModel,
  markExecutionApplied,
  markExecutionApplicationFailed,
} from "../modelExecution/index.js";
import { buildDecisionContext } from "../evaluations/buildDecisionContext.js";
import { persistIssueEvaluationOperation } from "../evaluations/issueEvaluationPersistence.js";
import { writeIssueStateSnapshot } from "../stateSnapshots/issueStateSnapshot.js";
import { getOrderedCriteriaForWeightingOrThrow } from "../evaluations/criteriaWeightingStructureData.js";
import { getOrderedLeafCriteriaDb } from "../shared/ordering.js";
import { hasOwnKey, isPlainObject } from "../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";
import { buildExpertWeightSnapshotOrThrow } from "../shared/expertWeights.js";
import {
  createIssueEventOperationMetadata,
  ISSUE_EVENT_TYPES,
  snapshotIssueLifecycle,
  snapshotParticipation,
  writeCriteriaWeightsChanged,
  writeConsensusEvent,
  writeIssueEvent,
  writeIssueStageChanged,
  writeParticipationCompletionChanged,
} from "../events/index.js";
import { tryGenerateFinishedIssueExecutionAnalysis } from "../resultsAnalysis/index.js";

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const validateComputeStageOrThrow = (stage) => {
  if (!EVALUATION_STAGE_VALUES.includes(stage)) {
    throw createBadRequestError(
      `Unsupported evaluation stage: ${String(stage)}`,
      {
        code: "UNSUPPORTED_EVALUATION_STAGE",
        field: "stage",
      }
    );
  }
};

const getStructureForIssueStage = ({ issue, stage }) => {
  const structureKeyByStage = {
    [EVALUATION_STAGES.CRITERIA_WEIGHTING]:
      issue.criteriaWeightsStructureKey,
    [EVALUATION_STAGES.ALTERNATIVE_EVALUATION]:
      issue.evaluationStructureKey,
  };

  return getEvaluationStructureOrThrow(structureKeyByStage[stage]);
};

const loadComputeContext = async ({ issueId, userId, stage }) => {
  validateComputeStageOrThrow(stage);

  const issue = await getIssueByIdOrThrow(issueId, {
    lean: false,
    populate: "model",
  });

  if (!sameId(issue.ownerId, userId)) {
    throw createForbiddenError("Only the issue owner can compute evaluation stages", {
      field: "userId",
    });
  }

  if (issue.active !== true) {
    throw createBadRequestError("Issue is not active", {
      code: "ISSUE_NOT_ACTIVE",
      field: "issueId",
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
  }).populate("expert", "name email");

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

  const relevantEvaluations = evaluations.filter((evaluation) =>
    expectedExperts.has(toIdString(evaluation.expert._id || evaluation.expert))
  );

  const completedExperts = new Set(
    relevantEvaluations.map((evaluation) =>
      toIdString(evaluation.expert._id || evaluation.expert)
    )
  );

  const missingExperts = [...expectedExperts].filter(
    (expertId) => !completedExperts.has(expertId)
  );

  if (
    relevantEvaluations.length !== participations.length ||
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

  return relevantEvaluations;
};

const resetAlternativeRoundCompletion = async ({
  issue,
  actorUser,
  occurredAt,
  correlationId,
  session = null,
}) => {
  const participations = await Participation.find({
    issue: issue._id,
    invitationStatus: "accepted",
  }).session(session);

  for (const participation of participations) {
    if (participation.evaluationCompleted !== true) continue;
    const previousState = snapshotParticipation(participation);
    participation.evaluationCompleted = false;
    await participation.save({ session });
    await writeParticipationCompletionChanged({
      issue,
      participation,
      previousState,
      actorType: "user",
      actorUser,
      occurredAt,
      correlationId,
      cause: "consensusPhaseAdvanced",
      changedFields: ["evaluationCompleted"],
      session,
    });
  }
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
    "executionAttempt",
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

  const { criteria } = await getOrderedCriteriaForWeightingOrThrow({ issue });
  if (issue.criteriaWeightingLevel === "parent") {
    const expectedCriterionIds = new Set(criteria.map((criterion) => criterion.id));
    const unexpectedCriterionId = Object.keys(computeResult.weightsByCriterion).find((criterionId) => !expectedCriterionIds.has(criterionId));
    if (unexpectedCriterionId) {
      throw createBadRequestError("Criteria weighting compute result contains an unknown criterion", {
        field: `computeResult.weightsByCriterion.${unexpectedCriterionId}`,
      });
    }
  }
  const normalizedWeightsByCriterion = {};
  criteria.forEach((criterion) => {
    if (!hasOwnKey(computeResult.weightsByCriterion, criterion.id)) {
      throw createBadRequestError(
        `Criteria weighting compute result is missing weight for criterion '${criterion.name}'`,
        {
          field: `computeResult.weightsByCriterion.${criterion.id}`,
        }
      );
    }

    const weight = Number(computeResult.weightsByCriterion[criterion.id]);
    if (!Number.isFinite(weight)) {
      throw createBadRequestError(
        `Criteria weighting compute result weight for criterion '${criterion.name}' must be finite`,
        {
          field: `computeResult.weightsByCriterion.${criterion.id}`,
        }
      );
    }

    normalizedWeightsByCriterion[criterion.id] = weight;
  });

  return {
    message,
    consensusMeasure: consensusMeasure ?? null,
    weightsByCriterion: normalizedWeightsByCriterion,
    collectiveEvaluations: computeResult.collectiveEvaluations,
    modelExecution: computeResult.modelExecution,
    rawOutput: computeResult.rawOutput,
  };
};

const resolveOperationalCriteriaWeightsOrThrow = async ({ issue, sourceWeightsByCriterion }) => {
  if (issue.criteriaWeightingLevel !== "parent") return sourceWeightsByCriterion;
  const { weightingCriteria } = await getOrderedCriteriaForWeightingOrThrow({ issue });
  const leafCriteria = await getOrderedLeafCriteriaDb({ issueId: issue._id, issueDoc: issue, select: "_id parentCriterion isLeaf position", lean: true });
  const parentIds = weightingCriteria.map((criterion) => toIdString(criterion._id));
  const sourceIds = Object.keys(sourceWeightsByCriterion);
  if (sourceIds.length !== parentIds.length || sourceIds.some((id) => !parentIds.includes(id))) {
    throw createBadRequestError("Parent criteria weighting result must contain exactly the resolved parent criteria", { field: "computeResult.weightsByCriterion" });
  }
  const operational = {};
  for (const parent of weightingCriteria) {
    const parentId = toIdString(parent._id);
    const parentWeight = sourceWeightsByCriterion[parentId];
    if (!isFiniteNumber(parentWeight) || parentWeight < 0) {
      throw createBadRequestError("Parent criteria weights must be finite and non-negative", { field: `computeResult.weightsByCriterion.${parentId}` });
    }
    const children = leafCriteria.filter((criterion) => toIdString(criterion.parentCriterion) === parentId);
    if (children.length === 0) {
      throw createBadRequestError(`Parent criterion '${parent.name}' has no direct leaf children`, { field: "criteriaWeightingConfig.level" });
    }
    const childWeight = parentWeight / children.length;
    children.forEach((child) => { operational[toIdString(child._id)] = childWeight; });
    if (Math.abs(childWeight * children.length - parentWeight) > 1e-9) {
      throw createBadRequestError("Propagated leaf weights do not reconstruct parent weights", { field: "computeResult.weightsByCriterion" });
    }
  }
  const parentTotal = Object.values(sourceWeightsByCriterion).reduce((sum, value) => sum + value, 0);
  const leafTotal = Object.values(operational).reduce((sum, value) => sum + value, 0);
  if (Math.abs(parentTotal - 1) > 1e-6 || Object.keys(operational).length !== leafCriteria.length || Math.abs(leafTotal - 1) > 1e-6 || Object.values(operational).some((value) => !isFiniteNumber(value) || value < 0)) {
    throw createBadRequestError("Criteria weights must sum to one after parent-to-leaf propagation", { field: "computeResult.weightsByCriterion" });
  }
  return operational;
};

const mapCriteriaWeightingResultToStageResult = (computeResult) => ({
  consensusMeasure: computeResult.consensusMeasure,
  weightsByCriterion: computeResult.weightsByCriterion,
  collectiveEvaluations: computeResult.collectiveEvaluations,
  modelExecution: computeResult.modelExecution,
  rawOutput: computeResult.rawOutput,
});

const applyCriteriaWeightingIssueUpdates = async ({
  issue,
  weightsByCriterion,
  operationalWeightsByCriterion = weightsByCriterion,
  stageResult,
  executionAttempt = null,
  actorUser,
  occurredAt,
  correlationId,
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

  const previousLifecycleState = snapshotIssueLifecycle(issue);
  const modelParameters = { ...issue.modelParameters };
  const previousWeightsByCriterionId = modelParameters.weights ?? {};

  issue.modelParameters = {
    ...modelParameters,
    weights: operationalWeightsByCriterion,
  };
  issue.criteriaWeightingSourceWeights = weightsByCriterion;
  issue.currentStage = ISSUE_STAGES.ALTERNATIVE_EVALUATION;
  await issue.save({ session });
  await writeCriteriaWeightsChanged({
    issue,
    previousWeightsByCriterionId,
      nextWeightsByCriterionId: operationalWeightsByCriterion,
      sourceWeightsByCriterionId: weightsByCriterion,
    actorType: "user",
    actorUser,
    occurredAt,
    correlationId,
    cause: "criteriaWeightingComputed",
    stageResultId: stageResult?._id,
    executionAttemptId: executionAttempt?._id,
    structureKey: issue.criteriaWeightsStructureKey,
    session,
  });
  await writeIssueStageChanged({
    issue,
    previousState: previousLifecycleState,
    actorType: "user",
    actorUser,
    occurredAt,
    correlationId,
    cause: "criteriaWeightingComputed",
    session,
  });
  if (issue.isConsensus === true) {
    const phaseStartEvent = await writeConsensusEvent({
      issue,
      eventType: ISSUE_EVENT_TYPES.CONSENSUS_PHASE_STARTED,
      phase: issue.consensusPhase,
      actorUser,
      occurredAt,
      correlationId,
      details: {
        threshold: issue.consensusThreshold,
        maxPhases: issue.consensusMaxPhases,
        simulated: issue.simulateConsensus === true,
      },
      session,
    });
    await writeIssueStateSnapshot({ issue, snapshotType: "consensusPhaseStart", occurredAt, correlationId, sourceEvent: phaseStartEvent._id, sourceExecutionAttempt: executionAttempt?._id ?? null, session });
  }
};

const saveStageResult = async ({
  issue,
  stage,
  computeResult,
  lifecycleMetadata = null,
  consensusPhase = issue.consensusPhase,
  expertWeights = [],
  executionAttempt = null,
  session = null,
}) => {
  let standardResult = null;
  const modelExecution = withConsensusLifecycleInModelExecution({
    modelExecution: computeResult.modelExecution,
    consensusLifecycle: lifecycleMetadata,
  });
  if (executionAttempt) {
    modelExecution.executionAttemptId = toIdString(executionAttempt._id);
    modelExecution.startedAt = executionAttempt.startedAt;
    modelExecution.completedAt = executionAttempt.completedAt;
    modelExecution.durationMs = executionAttempt.durationMs;
  }

  if (stage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    standardResult = {
      consensusMeasure: computeResult.consensusMeasure,
      weightsByCriterion: computeResult.weightsByCriterion,
      collectiveEvaluations: computeResult.collectiveEvaluations,
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

    standardResult = {
      consensusMeasure: computeResult.consensusMeasure,
      rankedAlternatives: computeResult.rankedAlternatives,
      collectiveEvaluations: computeResult.collectiveEvaluations,
      plotsGraphic: computeResult.plotsGraphic,
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

  return IssueStageResult.findOneAndUpdate(
    {
      issue: issue._id,
      stage,
      consensusPhase,
    },
    {
      $set: {
        inputSnapshot: { expertWeights },
        executionAttempt: executionAttempt?._id,
        result: {
          standardResult,
          modelExecution,
          rawOutput: computeResult.rawOutput,
        },
      },
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
  occurredAt,
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
    issue.finishedAt = occurredAt;
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
  expertWeightsByExpertId,
  decisionModelsServiceBaseUrl,
  httpClient,
  executionAttemptInput,
}) => {
  return executeCriteriaWeightingModel({
    issue,
    structure,
    structureKey: structure.key,
    evaluations,
    phase: issue.consensusPhase,
    expertWeightsByExpertId,
    decisionModelsServiceBaseUrl,
    httpClient,
    executionAttemptInput,
    normalizeResult: (result) => normalizeCriteriaWeightingComputeResultOrThrow({ issue, computeResult: result }),
  });
};

const computeAlternativeEvaluationStage = async ({
  structure,
  issue,
  evaluations,
  phase = issue.consensusPhase,
  expertWeightsByExpertId,
  decisionModelsServiceBaseUrl,
  httpClient,
  executionAttemptInput,
}) => {
  return executeAlternativeEvaluationModel({
    issue,
    structureKey: structure.key,
    evaluations,
    phase,
    expertWeightsByExpertId,
    decisionModelsServiceBaseUrl,
    httpClient,
    message:
      issue.isConsensus === true
        ? `${formatConsensusRoundLabel(phase)} for '${issue.name}' computed successfully.`
        : `Issue '${issue.name}' computed successfully.`,
    issueUpdates:
      issue.isConsensus === true
        ? {}
        : { active: false },
    nextCurrentStage:
      issue.isConsensus === true ? null : ISSUE_STAGES.FINISHED,
    executionAttemptInput,
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
    issue.consensusPhase < 0
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
  occurredAt,
  correlationId,
  sourceExecutionAttempt,
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
    const decisionContext = await buildDecisionContext({
      issue,
      structure,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      consensusPhase: nextPhase,
    });

    const normalizedPayload = await structure.save({
      mode: "submit",
      payload: suggestedPayload,
      decisionContext,
    });

    await persistIssueEvaluationOperation({ issueId: issue._id, userId: participation.expert, actorId: null, actorType: "system", stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION, consensusPhase: nextPhase, action: "generated", structureKey: structure.key, rawPayload: suggestedPayload, normalizedPayload, decisionContext, completed: true, submittedAt: null, occurredAt, correlationId, sourceExecutionAttempt: sourceExecutionAttempt._id, session });
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
  expertWeights,
  expertWeightsByExpertId,
  decisionModelsServiceBaseUrl,
  httpClient,
  actorUser,
  occurredAt,
  correlationId,
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
      expertWeightsByExpertId,
      decisionModelsServiceBaseUrl,
      httpClient,
      executionAttemptInput: { issue: issue._id, scope: "issueStage", actorType: "user", actorUser, correlationId, evaluationStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION, issueStage: issue.currentStage, consensusPhase: currentPhase, modelContext: { modelId: issue.model?._id ?? issue.model ?? null, modelName: issue.model?.name ?? null, apiModelKey: issue.apiModelKey ?? null, apiEndpointPath: issue.apiEndpoint?.path ?? null, evaluationStructureKey: structure.key, serviceBaseUrl: decisionModelsServiceBaseUrl ?? null, modelKind: "alternativeEvaluation" } },
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
    const applicationOccurredAt = new Date();
    const isFinal = lifecycleMetadata.consensusReached || lifecycleMetadata.maxPhasesReached;
    let committedStageResult = null;
    try {
      await persistComputedStageInTransaction({
        // Simulated rounds deliberately own an independent short transaction.
        session: null,
        persist: async (roundSession) => {
          const stageResult = await saveStageResult({ issue, stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION, computeResult: lifecycleComputeResult, lifecycleMetadata, consensusPhase: currentPhase, expertWeights, executionAttempt: phaseComputeResult.executionAttempt, session: roundSession });
          committedStageResult = stageResult;
          const executionAttemptId = toIdString(phaseComputeResult.executionAttempt._id);
          await writeConsensusEvent({ issue, eventType: ISSUE_EVENT_TYPES.CONSENSUS_COMPUTED, phase: currentPhase, actorUser, occurredAt: phaseComputeResult.executionAttempt.completedAt, correlationId, details: { phase: currentPhase, consensusMeasure: lifecycleMetadata.consensusMeasure, threshold: lifecycleMetadata.threshold, maxPhases: lifecycleMetadata.maxPhases, consensusReached: lifecycleMetadata.consensusReached, maxPhasesReached: lifecycleMetadata.maxPhasesReached, finalizationReason: lifecycleMetadata.finalizationReason, nextConsensusPhase: lifecycleMetadata.nextConsensusPhase, stageResultId: toIdString(stageResult._id), executionAttemptId }, session: roundSession });
          await writeConsensusEvent({ issue, eventType: ISSUE_EVENT_TYPES.CONSENSUS_PHASE_COMPLETED, phase: currentPhase, actorUser, occurredAt: applicationOccurredAt, correlationId, details: { phase: currentPhase, consensusMeasure: lifecycleMetadata.consensusMeasure, threshold: lifecycleMetadata.threshold, cause: lifecycleMetadata.finalizationReason ?? "continue", executionAttemptId }, session: roundSession });
          if (!isFinal) {
            const nextPhase = currentPhase + 1;
            await saveSimulatedEvaluationsForNextPhaseOrThrow({ issue, structure, acceptedParticipations, suggestions: getSuggestedEvaluationsOrThrow(lifecycleComputeResult.rawOutput), nextPhase, occurredAt: applicationOccurredAt, correlationId, sourceExecutionAttempt: phaseComputeResult.executionAttempt, session: roundSession });
            issue.consensusPhase = nextPhase;
            await issue.save({ session: roundSession });
            const phaseStartEvent = await writeConsensusEvent({ issue, eventType: ISSUE_EVENT_TYPES.CONSENSUS_PHASE_STARTED, phase: nextPhase, actorUser, occurredAt: applicationOccurredAt, correlationId, details: { threshold: issue.consensusThreshold, maxPhases: issue.consensusMaxPhases, simulated: true }, session: roundSession });
            await writeIssueStateSnapshot({ issue, snapshotType: "consensusPhaseStart", consensusPhase: nextPhase, occurredAt: applicationOccurredAt, correlationId, sourceEvent: phaseStartEvent._id, sourceExecutionAttempt: phaseComputeResult.executionAttempt._id, session: roundSession });
          } else {
            const previousLifecycleState = snapshotIssueLifecycle(issue);
            issue.consensusPhase = currentPhase; issue.currentStage = ISSUE_STAGES.FINISHED; issue.active = false; if (!issue.finishedAt) issue.finishedAt = applicationOccurredAt;
            await issue.save({ session: roundSession });
            await writeIssueStageChanged({ issue, previousState: previousLifecycleState, actorType: "user", actorUser, occurredAt: applicationOccurredAt, correlationId, cause: lifecycleMetadata.finalizationReason ?? "modelComputed", session: roundSession });
            await writeIssueEvent({ issueId: issue._id, eventType: ISSUE_EVENT_TYPES.ISSUE_FINISHED, actorType: "user", actorUser, stage: issue.currentStage, phase: issue.consensusPhase, occurredAt: applicationOccurredAt, correlationId, previousState: previousLifecycleState, nextState: snapshotIssueLifecycle(issue), details: { finalPhase: currentPhase, isConsensus: true, finalizationReason: lifecycleMetadata.finalizationReason ?? null, finalExecutionAttemptId: executionAttemptId }, session: roundSession });
          }
        },
      });
    } catch (error) {
      await markExecutionApplicationFailed({ attemptId: phaseComputeResult.executionAttempt._id, error });
      throw error;
    }
    await markExecutionApplied({ attemptId: phaseComputeResult.executionAttempt._id, entityType: "stageResult", entityId: committedStageResult._id, resultSnapshot: committedStageResult.toObject() });
    lastComputeResult = lifecycleComputeResult;
    lastLifecycleMetadata = lifecycleMetadata;
    if (isFinal) break;
    currentPhase += 1;
    currentEvaluations = await loadEvaluationsForCompute({ issueId: issue._id, stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION, consensusPhase: currentPhase, participations: acceptedParticipations });
  }

  if (issue.currentStage === ISSUE_STAGES.FINISHED && issue.active === false) {
    await tryGenerateFinishedIssueExecutionAnalysis({ issueId: issue._id, userId: actorUser, executionKey: "base" });
  }

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
      expertWeights,
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
  decisionModelsServiceBaseUrl,
  httpClient,
  occurredAt = null,
  correlationId = null,
  session = null,
}) => {
  const eventMetadata =
    occurredAt && correlationId
      ? { occurredAt, correlationId }
      : createIssueEventOperationMetadata();
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
  const { snapshot: expertWeights, weightsByExpertId } =
    buildExpertWeightSnapshotOrThrow({
      model: issue.model,
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
      expertWeights,
      expertWeightsByExpertId: weightsByExpertId,
      decisionModelsServiceBaseUrl,
      httpClient,
      actorUser: userId,
      occurredAt: eventMetadata.occurredAt,
      correlationId: eventMetadata.correlationId,
      session,
    });
  }

  const computeResult =
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
      ? await computeCriteriaWeightingStage({
        structure,
        issue,
        evaluations,
        expertWeightsByExpertId: weightsByExpertId,
        decisionModelsServiceBaseUrl,
        httpClient,
        executionAttemptInput: { issue: issue._id, scope: "issueStage", actorType: "user", actorUser: userId, correlationId: eventMetadata.correlationId, evaluationStage: stage, issueStage: issue.currentStage, consensusPhase: issue.consensusPhase, modelContext: { modelId: issue.criteriaWeightingModel ?? null, modelName: null, apiModelKey: issue.criteriaWeightingApiModelKey ?? null, apiEndpointPath: issue.criteriaWeightingApiEndpoint?.path ?? null, evaluationStructureKey: structure.key, serviceBaseUrl: decisionModelsServiceBaseUrl ?? null, modelKind: "criteriaWeighting" } },
      })
      : await computeAlternativeEvaluationStage({
        structure,
        issue,
        evaluations,
        expertWeightsByExpertId: weightsByExpertId,
        decisionModelsServiceBaseUrl,
        httpClient,
        executionAttemptInput: { issue: issue._id, scope: "issueStage", actorType: "user", actorUser: userId, correlationId: eventMetadata.correlationId, evaluationStage: stage, issueStage: issue.currentStage, consensusPhase: issue.consensusPhase, modelContext: { modelId: issue.model?._id ?? issue.model ?? null, modelName: issue.model?.name ?? null, apiModelKey: issue.apiModelKey ?? null, apiEndpointPath: issue.apiEndpoint?.path ?? null, evaluationStructureKey: structure.key, serviceBaseUrl: decisionModelsServiceBaseUrl ?? null, modelKind: "alternativeEvaluation" } },
      });

  if (stage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    const normalizedCriteriaWeightingResult = computeResult;
    const operationalWeights = await resolveOperationalCriteriaWeightsOrThrow({
      issue,
      sourceWeightsByCriterion: normalizedCriteriaWeightingResult.weightsByCriterion,
    });
    const applicationOccurredAt = new Date();

    let appliedStageResult = null;
    try { await persistComputedStageInTransaction({
      session,
      persist: async (persistSession) => {
        const stageResult = await saveStageResult({
          issue,
          stage,
          computeResult: mapCriteriaWeightingResultToStageResult(
            normalizedCriteriaWeightingResult
          ),
          lifecycleMetadata: null,
          expertWeights,
          executionAttempt: computeResult.executionAttempt,
          session: persistSession,
        });

        await applyCriteriaWeightingIssueUpdates({
          issue,
          weightsByCriterion: normalizedCriteriaWeightingResult.weightsByCriterion,
          operationalWeightsByCriterion: operationalWeights,
          stageResult,
          executionAttempt: computeResult.executionAttempt,
          actorUser: userId,
          occurredAt: applicationOccurredAt,
          correlationId: eventMetadata.correlationId,
          session: persistSession,
        });
        appliedStageResult = stageResult;
      },
    }); } catch (error) { await markExecutionApplicationFailed({ attemptId: computeResult.executionAttempt._id, error }); throw error; }
    await markExecutionApplied({ attemptId: computeResult.executionAttempt._id, entityType: "stageResult", entityId: appliedStageResult._id, resultSnapshot: appliedStageResult.toObject() });

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
        expertWeights,
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

  const applicationOccurredAt = new Date();

  let appliedStageResult = null;
  try { await persistComputedStageInTransaction({
    session,
    persist: async (persistSession) => {
      const previousLifecycleState = snapshotIssueLifecycle(issue);
      const computedPhase = issue.consensusPhase;
      const stageResult = await saveStageResult({
        issue,
        stage,
        computeResult: lifecycleComputeResult,
        lifecycleMetadata,
        expertWeights,
        executionAttempt: computeResult.executionAttempt,
        session: persistSession,
      });
      appliedStageResult = stageResult;

      if (lifecycleMetadata) {
        const lifecycleDetails = {
          phase: computedPhase,
          consensusMeasure: lifecycleMetadata.consensusMeasure,
          threshold: lifecycleMetadata.threshold,
          maxPhases: lifecycleMetadata.maxPhases,
          consensusReached: lifecycleMetadata.consensusReached,
          maxPhasesReached: lifecycleMetadata.maxPhasesReached,
          finalizationReason: lifecycleMetadata.finalizationReason,
          nextConsensusPhase: lifecycleMetadata.nextConsensusPhase,
          stageResultId: toIdString(stageResult?._id) || null,
          executionAttemptId: toIdString(computeResult.executionAttempt._id),
        };
        await writeConsensusEvent({
          issue,
          eventType: ISSUE_EVENT_TYPES.CONSENSUS_COMPUTED,
          phase: computedPhase,
          actorUser: userId,
          occurredAt: computeResult.executionAttempt.completedAt,
          correlationId: eventMetadata.correlationId,
          details: lifecycleDetails,
          session: persistSession,
        });
        await writeConsensusEvent({
          issue,
          eventType: ISSUE_EVENT_TYPES.CONSENSUS_PHASE_COMPLETED,
          phase: computedPhase,
          actorUser: userId,
          occurredAt: applicationOccurredAt,
          correlationId: eventMetadata.correlationId,
          details: {
            phase: computedPhase,
            consensusMeasure: lifecycleMetadata.consensusMeasure,
            threshold: lifecycleMetadata.threshold,
            cause: lifecycleMetadata.finalizationReason ?? "continue",
          },
          session: persistSession,
        });
      }

      await applyComputeIssueUpdates({
        issue,
        computeResult: lifecycleComputeResult,
        occurredAt: applicationOccurredAt,
        session: persistSession,
      });

      if (resetAlternativeEvaluationCompletion) {
        await resetAlternativeRoundCompletion({
          issue,
          actorUser: userId,
          occurredAt: applicationOccurredAt,
          correlationId: eventMetadata.correlationId,
          session: persistSession,
        });
      }

      if (lifecycleMetadata) {
        if (!lifecycleMetadata.consensusReached && !lifecycleMetadata.maxPhasesReached) {
          const phaseStartEvent = await writeConsensusEvent({
            issue,
            eventType: ISSUE_EVENT_TYPES.CONSENSUS_PHASE_STARTED,
            phase: issue.consensusPhase,
            actorUser: userId,
            occurredAt: applicationOccurredAt,
            correlationId: eventMetadata.correlationId,
            details: {
              threshold: issue.consensusThreshold,
              maxPhases: issue.consensusMaxPhases,
              simulated: issue.simulateConsensus === true,
            },
            session: persistSession,
          });
          await writeIssueStateSnapshot({ issue, snapshotType: "consensusPhaseStart", occurredAt: applicationOccurredAt, correlationId: eventMetadata.correlationId, sourceEvent: phaseStartEvent._id, sourceExecutionAttempt: computeResult.executionAttempt._id, session: persistSession });
        }
      }

      await writeIssueStageChanged({
        issue,
        previousState: previousLifecycleState,
        actorType: "user",
        actorUser: userId,
        occurredAt: applicationOccurredAt,
        correlationId: eventMetadata.correlationId,
        cause: lifecycleMetadata?.finalizationReason ?? "modelComputed",
        session: persistSession,
      });
      if (issue.currentStage === ISSUE_STAGES.FINISHED && issue.active === false) {
        await writeIssueEvent({
          issueId: issue._id,
          eventType: ISSUE_EVENT_TYPES.ISSUE_FINISHED,
          actorType: "user",
          actorUser: userId,
          stage: issue.currentStage,
          phase: issue.consensusPhase,
          occurredAt: applicationOccurredAt,
          correlationId: eventMetadata.correlationId,
          previousState: previousLifecycleState,
          nextState: snapshotIssueLifecycle(issue),
          details: {
            finalPhase: issue.consensusPhase,
            isConsensus: issue.isConsensus === true,
            finalizationReason: lifecycleMetadata?.finalizationReason ?? "modelComputed",
            finalExecutionAttemptId: toIdString(computeResult.executionAttempt._id),
          },
          session: persistSession,
        });
      }
    },
  }); } catch (error) { await markExecutionApplicationFailed({ attemptId: computeResult.executionAttempt._id, error }); throw error; }
  await markExecutionApplied({ attemptId: computeResult.executionAttempt._id, entityType: "stageResult", entityId: appliedStageResult._id, resultSnapshot: appliedStageResult.toObject() });

  if (issue.currentStage === ISSUE_STAGES.FINISHED && issue.active === false) {
    await tryGenerateFinishedIssueExecutionAnalysis({ issueId: issue._id, userId, executionKey: "base" });
  }

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
      expertWeights,
    },
  };
};
