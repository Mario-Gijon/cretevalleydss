import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";
import { getIssueByIdOrThrow } from "../issue.queries.js";
import {
  createBadRequestError,
  createForbiddenError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import {
  EVALUATION_STAGES,
  ISSUE_STAGES,
} from "./evaluation.constants.js";
import { getEvaluationStructureOrThrow } from "./evaluation.registry.js";
import { resolveEvaluationComputeLifecycle } from "./evaluation.lifecycle.js";
import {
  executeAlternativeEvaluationModel,
  executeCriteriaWeightingModel,
} from "../modelExecution/index.js";
import { getOrderedCriterionNames } from "./structures/shared/criteriaWeighting.helpers.js";

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

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

const resetAlternativeRoundCompletion = async (issueId) => {
  await Participation.updateMany(
    {
      issue: issueId,
      invitationStatus: "accepted",
    },
    {
      $set: {
        evaluationCompleted: false,
      },
    }
  );
};

const withConsensusLifecycleInModelExecution = ({
  modelExecution,
  consensusLifecycle,
}) => {
  const normalizedModelExecution =
    isPlainObject(modelExecution)
      ? { ...modelExecution }
      : {};

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
    if (!hasOwn(computeResult.weightsByCriterion, criterionName)) {
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

const applyCriteriaWeightingIssueUpdates = async ({ issue, orderedWeights }) => {
  const modelParameters = isPlainObject(issue?.modelParameters)
    ? { ...issue.modelParameters }
    : {};

  issue.modelParameters = {
    ...modelParameters,
    weights: orderedWeights,
  };
  issue.currentStage = ISSUE_STAGES.ALTERNATIVE_EVALUATION;
  await issue.save();
};

const saveStageResult = async ({
  issue,
  stage,
  computeResult,
  lifecycleMetadata = null,
}) => {
  await IssueStageResult.findOneAndUpdate(
    {
      issue: issue._id,
      stage,
      consensusPhase: issue.consensusPhase,
    },
    {
      $set: {
        consensusMeasure: computeResult.consensusMeasure,
        ...(Array.isArray(computeResult.rankedAlternatives)
          ? { rankedAlternatives: computeResult.rankedAlternatives }
          : {}),
        collectiveEvaluations: computeResult.collectiveEvaluations,
        ...(isPlainObject(computeResult.plotsGraphic)
          ? { plotsGraphic: computeResult.plotsGraphic }
          : {}),
        modelExecution: withConsensusLifecycleInModelExecution({
          modelExecution: computeResult.modelExecution,
          consensusLifecycle: lifecycleMetadata,
        }),
        rawOutput: computeResult.rawOutput,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

const applyComputeIssueUpdates = async ({ issue, computeResult }) => {
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
    await issue.save();
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

  return executeAlternativeEvaluationModel({
    issue,
    structureKey: structure.key,
    evaluations,
    phase: issue.consensusPhase,
    apiModelsBaseUrl,
    httpClient,
    message:
      issue.isConsensus === true
        ? `Consensus round ${issue.consensusPhase} for '${issue.name}' computed successfully.`
        : `Issue '${issue.name}' computed successfully.`,
    issueUpdates:
      issue.isConsensus === true
        ? {}
        : { active: false },
    nextCurrentStage:
      issue.isConsensus === true ? null : ISSUE_STAGES.FINISHED,
  });
};

export const computeIssueEvaluationStage = async ({
  issueId,
  userId,
  stage,
  apiModelsBaseUrl,
  httpClient,
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

    await saveStageResult({
      issue,
      stage,
      computeResult: mapCriteriaWeightingResultToStageResult(
        normalizedCriteriaWeightingResult
      ),
      lifecycleMetadata: null,
    });

    await applyCriteriaWeightingIssueUpdates({
      issue,
      orderedWeights: normalizedCriteriaWeightingResult.orderedWeights,
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

  await saveStageResult({
    issue,
    stage,
    computeResult: lifecycleComputeResult,
    lifecycleMetadata,
  });

  await applyComputeIssueUpdates({
    issue,
    computeResult: lifecycleComputeResult,
  });

  if (resetAlternativeEvaluationCompletion) {
    await resetAlternativeRoundCompletion(issue._id);
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
    },
  };
};
