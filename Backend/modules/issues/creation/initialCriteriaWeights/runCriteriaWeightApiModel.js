import { IssueModel } from "../../../../models/IssueModels.js";
import {
  getEvaluationStructureOrThrow,
} from "../../../decisionPlugins/evaluations/index.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../../modelParameters/validateAndNormalizeModelParameters.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import {
  validateCriteriaWeightingModelRuntimeConfigOrThrow,
} from "./validateCriteriaWeightModelRuntime.js";
import { executeTrackedDecisionModelRequest } from "../../modelExecution/index.js";
import { buildCreatorDecisionContext } from "./buildCreatorDecisionContext.js";

const loadCriteriaWeightingModelOrThrow = async ({
  resolvedConfig,
  session = null,
}) => {
  const selectedModelId = resolvedConfig.criteriaWeightingModelId;
  const selectedModelKey = resolvedConfig.criteriaWeightingModelKey;

  if (!selectedModelId && !selectedModelKey) {
    throw createBadRequestError(
      "criteriaWeightingConfig.criteriaWeightingModelId or criteriaWeightingConfig.criteriaWeightingModelKey is required",
      {
        field: "criteriaWeightingConfig.criteriaWeightingModelId",
      }
    );
  }

  const query = {
    modelKind: "criteriaWeighting",
    $or: [
      { visibleInCriteriaWeighting: { $exists: false } },
      { visibleInCriteriaWeighting: { $ne: false } },
    ],
    "manifestSync.isStale": false,
  };

  if (selectedModelId) {
    query._id = selectedModelId;
  } else {
    query.apiModelKey = selectedModelKey;
  }

  const criteriaWeightingModel = await IssueModel.findOne(query).session(session);
  if (!criteriaWeightingModel) {
    throw createBadRequestError("Selected criteria weighting model does not exist", {
      field: selectedModelId
        ? "criteriaWeightingConfig.criteriaWeightingModelId"
        : "criteriaWeightingConfig.criteriaWeightingModelKey",
    });
  }

  return criteriaWeightingModel;
};

const validateCriteriaWeightingParametersOrThrow = ({
  criteriaWeightingModel,
  criteriaWeightingParameters,
  leafCriteria,
}) => {
  return validateAndNormalizeModelParametersOrThrow({
    model: criteriaWeightingModel,
    paramValues: criteriaWeightingParameters,
    criteriaNodes: leafCriteria,
    alternatives: [],
  });
};

export const loadCriteriaWeightingApiModelContextOrThrow = async ({
  resolvedConfig,
  criteriaWeightingParameters,
  leafCriteria,
  session = null,
}) => {
  const criteriaWeightingModel = await loadCriteriaWeightingModelOrThrow({
    resolvedConfig,
    session,
  });
  const criteriaWeightingRuntime =
    validateCriteriaWeightingModelRuntimeConfigOrThrow(criteriaWeightingModel);
  const normalizedCriteriaWeightingParameters =
    validateCriteriaWeightingParametersOrThrow({
      criteriaWeightingModel,
      criteriaWeightingParameters,
      leafCriteria,
    });

  return {
    criteriaWeightingModel,
    criteriaWeightingRuntime,
    normalizedCriteriaWeightingParameters,
  };
};

export const normalizeCreatorApiCriteriaWeightingPayloadOrThrow = async ({
  payload,
  leafCriteria,
  criteriaWeightingModel,
  criteriaWeightingRuntime,
  criteriaWeightingParameters,
  creatorDecisionContext = null,
}) => {
  const criteriaWeightingStructure = getEvaluationStructureOrThrow(
    criteriaWeightingRuntime.criteriaWeightsStructureKey
  );
  const criteria = Array.isArray(leafCriteria) ? leafCriteria : [];
  if (criteria.length === 0) {
    throw createInternalError("leafCriteria are required for creator API model mode", {
      field: "leafCriteria",
    });
  }

  const normalizedCreatorDecisionContext =
    creatorDecisionContext ??
    buildCreatorDecisionContext({
      criteriaWeightingStructure,
      criteriaWeightingModel,
      normalizedCriteriaWeightingParameters: criteriaWeightingParameters,
      leafCriteria: criteria,
    });

  const normalizedCreatorPayload =
    await criteriaWeightingStructure.save({
      mode: "submit",
      payload,
      decisionContext: normalizedCreatorDecisionContext,
    });

  return normalizedCreatorPayload;
};

export const resolveCreatorApiCriteriaWeightingModelWeightsOrThrow = async ({
  payload,
  leafCriteria,
  criteriaWeightingModel,
  criteriaWeightingRuntime,
  criteriaWeightingParameters,
  decisionModelsServiceBaseUrl,
  httpClient,
  executionAttemptInput,
}) => {
  if (!decisionModelsServiceBaseUrl || typeof decisionModelsServiceBaseUrl !== "string") {
    throw createInternalError(
      "decisionModelsServiceBaseUrl is required for creator API model mode",
      {
        field: "decisionModelsServiceBaseUrl",
      }
    );
  }

  if (!httpClient || typeof httpClient.post !== "function") {
    throw createInternalError("httpClient.post is required for creator API model mode", {
      field: "httpClient",
    });
  }

  const normalizedBaseUrl = decisionModelsServiceBaseUrl.replace(/\/+$/g, "");
  const criteriaWeightingStructure = getEvaluationStructureOrThrow(
    criteriaWeightingRuntime.criteriaWeightsStructureKey
  );
  const criteria = Array.isArray(leafCriteria) ? leafCriteria : [];
  if (criteria.length === 0) {
    throw createInternalError("leafCriteria are required for creator API model mode", {
      field: "leafCriteria",
    });
  }

  const creatorDecisionContext =
    buildCreatorDecisionContext({
      criteriaWeightingStructure,
      criteriaWeightingModel,
      normalizedCriteriaWeightingParameters: criteriaWeightingParameters,
      leafCriteria: criteria,
    });
  const normalizedCreatorPayload = await normalizeCreatorApiCriteriaWeightingPayloadOrThrow({
    payload,
    leafCriteria: criteria,
    criteriaWeightingModel,
    criteriaWeightingRuntime,
    criteriaWeightingParameters,
    creatorDecisionContext,
  });

  const requestPayload = {
    modelParameters: criteriaWeightingParameters,
    evaluations: [
      {
        expert: {
          id: "creator",
          name: "Creator",
          email: "creator@local",
        },
        payload: normalizedCreatorPayload,
      },
    ],
    context: {
      issue: {
        id: creatorDecisionContext.issue.id,
        name: creatorDecisionContext.issue.name,
        currentStage: creatorDecisionContext.issue.currentStage,
        consensusThreshold:
          creatorDecisionContext.issue.consensusThreshold,
        consensusMaxPhases:
          creatorDecisionContext.issue.consensusMaxPhases,
      },
      criteria: creatorDecisionContext.leafCriteria.map(
        (criterion) => ({
          id: criterion.id,
          name: criterion.name,
          type: criterion.type || null,
        })
      ),
      consensusPhase: creatorDecisionContext.consensus.phase,
      previousStageResult: null,
      structure: creatorDecisionContext.structure,
    },
  };

  const tracked = await executeTrackedDecisionModelRequest({
    attemptInput: executionAttemptInput,
    apiEndpointPath: criteriaWeightingRuntime.apiEndpoint.path,
    requestPayload,
    errorMessage: `Failed to compute ${criteriaWeightingModel.name} weights`,
    decisionModelsServiceBaseUrl: normalizedBaseUrl,
    httpClient,
    normalize: async (result) => {
      const weightsByCriterion = result?.weightsByCriterion;
      if (!isPlainObject(weightsByCriterion)) throw createBadRequestError(`${criteriaWeightingModel.name} output does not contain weightsByCriterion`, { field: "criteriaWeightingConfig.payload" });
      const normalized = criteria.reduce((accumulator, criterion) => { const numeric = Number(weightsByCriterion[criterion.id]); if (!Number.isFinite(numeric)) throw createBadRequestError(`${criteriaWeightingModel.name} output contains invalid weight for '${criterion.name}'`, { field: "criteriaWeightingConfig.payload" }); accumulator[criterion.id] = numeric; return accumulator; }, {});
      const total = Object.values(normalized).reduce((sum, value) => sum + value, 0);
      if (!(total > 0)) throw createBadRequestError(`${criteriaWeightingModel.name} output weights cannot be normalized`, { field: "criteriaWeightingConfig.payload" });
      return Object.fromEntries(Object.entries(normalized).map(([criterionId, value]) => [criterionId, value / total]));
    },
  });
  return { weights: tracked.result, executionAttempt: tracked.attempt };
};
