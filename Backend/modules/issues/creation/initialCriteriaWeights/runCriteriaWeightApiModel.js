import { IssueModel } from "../../../../models/IssueModels.js";
import {
  getEvaluationStructureOrThrow,
} from "../../../decisionPlugins/evaluations/index.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../../decisionPlugins/modelParameters/index.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import {
  validateCriteriaWeightingModelRuntimeConfigOrThrow,
} from "./validateCriteriaWeightModelRuntime.js";
import { executeDecisionModelRequest } from "../../modelExecution/index.js";
import { buildCreatorCriteriaWeightingEvaluationContext } from "./buildCreatorCriteriaWeightingEvaluationContext.js";

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
    isCriteriaWeightingModel: true,
    $or: [
      { visibleInCriteriaWeighting: { $exists: false } },
      { visibleInCriteriaWeighting: { $ne: false } },
    ],
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
  criterionNames,
}) => {
  return validateAndNormalizeModelParametersOrThrow({
    model: criteriaWeightingModel,
    paramValues: criteriaWeightingParameters,
    criteriaNodes: criterionNames.map((criterionName) => ({
      name: criterionName,
      children: [],
    })),
    alternativesCount: null,
  });
};

export const loadCriteriaWeightingApiModelContextOrThrow = async ({
  resolvedConfig,
  criteriaWeightingParameters,
  criterionNames,
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
      criterionNames,
    });

  return {
    criteriaWeightingModel,
    criteriaWeightingRuntime,
    normalizedCriteriaWeightingParameters,
  };
};

export const resolveCreatorApiCriteriaWeightingModelWeightsOrThrow = async ({
  payload,
  criterionNames,
  leafCriteria,
  criteriaWeightingModel,
  criteriaWeightingRuntime,
  criteriaWeightingParameters,
  decisionModelsServiceBaseUrl,
  httpClient,
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
    criteriaWeightingRuntime.criteriaWeightingStructureKey
  );
  const creatorCriteriaWeightingEvaluationContext =
    buildCreatorCriteriaWeightingEvaluationContext({
      criteriaWeightingStructure,
      criteriaWeightingModel,
      normalizedCriteriaWeightingParameters: criteriaWeightingParameters,
      leafCriteria:
        Array.isArray(leafCriteria) && leafCriteria.length > 0
          ? leafCriteria
          : criterionNames,
    });
  const normalizedCreatorPayload = await criteriaWeightingStructure.save({
    mode: "submit",
    payload,
    evaluationContext: creatorCriteriaWeightingEvaluationContext,
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
        id: creatorCriteriaWeightingEvaluationContext.issue.id,
        name: creatorCriteriaWeightingEvaluationContext.issue.name,
        currentStage: creatorCriteriaWeightingEvaluationContext.issue.currentStage,
        consensusThreshold:
          creatorCriteriaWeightingEvaluationContext.issue.consensusThreshold,
        consensusMaxPhases:
          creatorCriteriaWeightingEvaluationContext.issue.consensusMaxPhases,
      },
      criteria: creatorCriteriaWeightingEvaluationContext.criteria.leafItems.map(
        (criterion, index) => ({
          id: criterion.id || `${index + 1}`,
          name: criterion.name,
          type: criterion.type || null,
        })
      ),
      consensusPhase: creatorCriteriaWeightingEvaluationContext.consensus.phase,
      previousStageResult: null,
      structure: creatorCriteriaWeightingEvaluationContext.structure,
    },
  };

  const result = await executeDecisionModelRequest({
    apiEndpointPath: criteriaWeightingRuntime.apiEndpoint.path,
    requestPayload,
    errorMessage: `Failed to compute ${criteriaWeightingModel.name} weights`,
    decisionModelsServiceBaseUrl: normalizedBaseUrl,
    httpClient,
  });

  const weightsByCriterion = result?.weightsByCriterion;
  if (!isPlainObject(weightsByCriterion)) {
    throw createBadRequestError(
      `${criteriaWeightingModel.name} output does not contain weightsByCriterion`,
      {
        field: "criteriaWeightingConfig.payload",
      }
    );
  }

  const weights = criterionNames.map((criterionName) => {
    const numeric = Number(weightsByCriterion[criterionName]);
    if (!Number.isFinite(numeric)) {
      throw createBadRequestError(
        `${criteriaWeightingModel.name} output contains invalid weight for '${criterionName}'`,
        {
          field: "criteriaWeightingConfig.payload",
        }
      );
    }
    return numeric;
  });

  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) {
    throw createBadRequestError(
      `${criteriaWeightingModel.name} output weights cannot be normalized`,
      {
        field: "criteriaWeightingConfig.payload",
      }
    );
  }

  return weights.map((value) => value / total);
};
