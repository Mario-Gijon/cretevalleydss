import { Issue } from "../../../models/Issues.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueModel } from "../../../models/IssueModels.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";
import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../issue.ordering.js";
import {
  createBadRequestError,
  createForbiddenError,
  createInternalError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { normalizeScenarioParamOverridesOrThrow } from "./scenario.params.js";
import { validateAndNormalizeModelParametersOrThrow } from "../modelParameters/index.js";
import {
  buildTargetModelRuntimeSnapshotOrThrow,
  validateScenarioModelCompatibilityOrThrow,
} from "./scenario.compatibility.js";
import { EVALUATION_STAGES } from "../evaluations/evaluation.constants.js";

const getModelParameterMetadata = (modelDoc) => {
  const parameters = Array.isArray(modelDoc?.parameters) ? modelDoc.parameters : [];

  const parameterKeys = new Set();
  let criteriaWeightsParameterKey = null;

  for (const parameter of parameters) {
    const key = String(parameter?.key || "").trim();
    if (!key) continue;

    parameterKeys.add(key);

    const semanticRole = String(parameter?.semanticRole || "").trim();
    if (semanticRole === "criteriaWeights" && !criteriaWeightsParameterKey) {
      criteriaWeightsParameterKey = key;
    }
  }

  return {
    parameterKeys,
    criteriaWeightsParameterKey,
  };
};

const getTargetScenarioModelOrThrow = async ({ targetModelId }) => {
  const cleanTargetModelId = String(targetModelId || "").trim();

  if (!cleanTargetModelId) {
    throw createBadRequestError("targetModelId is required", {
      field: "targetModelId",
    });
  }

  if (!isValidObjectIdLike(cleanTargetModelId)) {
    throw createBadRequestError("targetModelId must be a valid id", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  const targetModel = await IssueModel.findById(cleanTargetModelId);

  if (!targetModel) {
    throw createBadRequestError("Target model not found", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  if (targetModel.isIssueModel !== true) {
    throw createBadRequestError("Target model is not available for issue simulation", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  if (targetModel?.manifestSync?.isStale === true) {
    throw createBadRequestError("Target model is stale and cannot be used for simulation", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  return targetModel;
};

const resolveLatestAlternativeResultOrThrow = async ({ issue }) => {
  const latestAlternativeResult = await IssueStageResult.findOne({
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  })
    .sort({ consensusPhase: -1 })
    .lean();

  if (!latestAlternativeResult) {
    throw createBadRequestError(
      "Alternative evaluation result is required before creating model runs",
      {
        field: "stageResult",
      }
    );
  }

  const phase = latestAlternativeResult.consensusPhase;

  if (!Number.isInteger(phase) || phase < 1) {
    throw createInternalError("Alternative evaluation result has invalid consensus phase", {
      field: "consensusPhase",
      details: {
        issueId: toIdString(issue._id),
        consensusPhase: phase,
      },
    });
  }

  return {
    latestAlternativeResult,
    phase,
  };
};

const validateEvaluationCoverageOrThrow = ({
  issue,
  phase,
  acceptedParticipations,
  completedEvaluations,
}) => {
  if (acceptedParticipations.length === 0) {
    throw createBadRequestError("No accepted experts found", {
      field: "participations",
    });
  }

  if (completedEvaluations.length !== acceptedParticipations.length) {
    throw createBadRequestError(
      "Completed alternative evaluations are missing for scenario execution",
      {
        field: "evaluations",
        details: {
          issueId: toIdString(issue._id),
          phase,
          expected: acceptedParticipations.length,
          received: completedEvaluations.length,
        },
      }
    );
  }

  const acceptedExpertIds = new Set(
    acceptedParticipations.map((participation) =>
      toIdString(participation?.expert?._id || participation?.expert)
    )
  );

  const completedExpertIds = new Set(
    completedEvaluations.map((evaluation) =>
      toIdString(evaluation?.expert?._id || evaluation?.expert)
    )
  );

  for (const acceptedExpertId of acceptedExpertIds) {
    if (!completedExpertIds.has(acceptedExpertId)) {
      throw createBadRequestError(
        "Completed alternative evaluations are missing for one or more accepted experts",
        {
          field: "evaluations",
          details: {
            issueId: toIdString(issue._id),
            phase,
            expertId: acceptedExpertId,
          },
        }
      );
    }
  }
};

const buildScenarioParametersOrThrow = ({
  issue,
  targetModel,
  paramOverrides,
  criteria,
  alternatives,
}) => {
  const issueModelParameters =
    issue?.modelParameters && typeof issue.modelParameters === "object"
      ? issue.modelParameters
      : {};

  const issueWeights = issueModelParameters.weights;
  if (!Array.isArray(issueWeights)) {
    throw createBadRequestError("Issue model weights are required for scenario execution", {
      field: "modelParameters.weights",
    });
  }

  if (issueWeights.length !== criteria.length) {
    throw createBadRequestError(
      "Issue model weights length must match the number of leaf criteria",
      {
        field: "modelParameters.weights",
        details: {
          expected: criteria.length,
          received: issueWeights.length,
        },
      }
    );
  }

  const normalizedOverrides = normalizeScenarioParamOverridesOrThrow(paramOverrides);
  const { parameterKeys, criteriaWeightsParameterKey } =
    getModelParameterMetadata(targetModel);

  const baseIssueParameters = Object.fromEntries(
    Object.entries(issueModelParameters).filter(([key]) => parameterKeys.has(key))
  );

  const hasWeightsOverride = Boolean(
    criteriaWeightsParameterKey &&
      Object.prototype.hasOwnProperty.call(
        normalizedOverrides,
        criteriaWeightsParameterKey
      )
  );

  if (criteriaWeightsParameterKey && !hasWeightsOverride) {
    baseIssueParameters[criteriaWeightsParameterKey] = issueWeights;
  }

  const rawScenarioParams = {
    ...baseIssueParameters,
    ...normalizedOverrides,
  };

  const normalizedScenarioParameters =
    validateAndNormalizeModelParametersOrThrow({
      model: targetModel,
      paramValues: rawScenarioParams,
      criteriaNodes: criteria,
      alternativesCount: alternatives.length,
    });

  const resolvedWeights = criteriaWeightsParameterKey
    ? normalizedScenarioParameters[criteriaWeightsParameterKey]
    : issueWeights;

  if (!Array.isArray(resolvedWeights)) {
    throw createBadRequestError(
      "Scenario model parameters must include criteria weights as an array",
      {
        field: criteriaWeightsParameterKey || "modelParameters.weights",
      }
    );
  }

  if (resolvedWeights.length !== criteria.length) {
    throw createBadRequestError(
      "Scenario model weights length must match the number of leaf criteria",
      {
        field: criteriaWeightsParameterKey || "modelParameters.weights",
        details: {
          expected: criteria.length,
          received: resolvedWeights.length,
        },
      }
    );
  }

  return {
    paramsUsed: normalizedScenarioParameters,
    normalizedParams: normalizedScenarioParameters,
    weightsUsed: resolvedWeights,
  };
};

export const getCreateScenarioContext = async ({
  issueId,
  userId,
  targetModelId,
  paramOverrides,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await Issue.findById(issueId).populate("model");
  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError("Not authorized: only admin can create scenarios");
  }

  const targetModel = await getTargetScenarioModelOrThrow({ targetModelId });
  const targetRuntimeSnapshot = buildTargetModelRuntimeSnapshotOrThrow(targetModel);

  validateScenarioModelCompatibilityOrThrow({
    issue,
    targetRuntimeSnapshot,
  });

  const { latestAlternativeResult, phase } =
    await resolveLatestAlternativeResultOrThrow({ issue });

  const [participations, completedEvaluations, alternatives, criteria] =
    await Promise.all([
      Participation.find({
        issue: issue._id,
        invitationStatus: "accepted",
      })
        .populate("expert", "email name")
        .lean(),
      IssueEvaluation.find({
        issue: issue._id,
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        consensusPhase: phase,
        completed: true,
      })
        .populate("expert", "email name")
        .lean(),
      getOrderedAlternativesDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name",
        lean: true,
      }),
      getOrderedLeafCriteriaDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name type",
        lean: true,
      }),
    ]);

  if (!alternatives.length) {
    throw createBadRequestError("Issue has no alternatives", {
      field: "alternatives",
    });
  }

  if (!criteria.length) {
    throw createBadRequestError("Issue has no leaf criteria", {
      field: "criteria",
    });
  }

  validateEvaluationCoverageOrThrow({
    issue,
    phase,
    acceptedParticipations: participations,
    completedEvaluations,
  });

  const { paramsUsed, normalizedParams, weightsUsed } =
    buildScenarioParametersOrThrow({
      issue,
      targetModel,
      paramOverrides,
      criteria,
      alternatives,
    });

  const evaluationsByExpertId = new Map(
    completedEvaluations.map((evaluation) => [
      toIdString(evaluation?.expert?._id || evaluation?.expert),
      evaluation,
    ])
  );

  const sortedParticipations = [...participations].sort((left, right) => {
    const leftEmail = String(left?.expert?.email || "").trim();
    const rightEmail = String(right?.expert?.email || "").trim();
    return leftEmail.localeCompare(rightEmail);
  });

  const evaluationPayloads = sortedParticipations.map((participation) => {
    const expertId = toIdString(participation?.expert?._id || participation?.expert);
    const evaluation = evaluationsByExpertId.get(expertId);

    if (!evaluation) {
      throw createInternalError(
        "Completed alternative evaluation missing for accepted expert",
        {
          field: "evaluations",
          details: {
            issueId: toIdString(issue._id),
            expertId,
          },
        }
      );
    }

    return {
      expert: {
        id: expertId,
        name: evaluation?.expert?.name || "",
        email: evaluation?.expert?.email || "",
      },
      payload: evaluation?.payload || {},
    };
  });

  const scenarioExecutionContext = {
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
    },
    alternatives: alternatives.map((alternative) => ({
      id: toIdString(alternative._id),
      name: alternative.name,
    })),
    criteria: criteria.map((criterion) => ({
      id: toIdString(criterion._id),
      name: criterion.name,
      type: criterion.type,
    })),
    weights: weightsUsed,
    consensusPhase: phase,
    previousStageResult: latestAlternativeResult,
  };

  const requestPayload = {
    modelParameters: normalizedParams,
    evaluations: evaluationPayloads,
    context: scenarioExecutionContext,
  };

  return {
    issue,
    targetModel,
    targetRuntimeSnapshot,
    alternatives,
    criteria,
    participations,
    completedEvaluations,
    latestAlternativeResult,
    domainType: null,
    paramsUsed,
    normalizedParams,
    weightsUsed,
    expertsOrder: evaluationPayloads.map((entry) => entry.expert.email || entry.expert.id),
    evaluationPhase: phase,
    evaluationPayloads,
    scenarioExecutionContext,
    requestPayload,
  };
};
