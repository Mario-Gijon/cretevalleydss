import { IssueModel } from "../../../models/IssueModels.js";
import { validateAndNormalizeModelParametersOrThrow } from "../modelParameters/index.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../services/modelApi/modelResponse.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import {
  validateCriteriaWeightingModelRuntimeConfigOrThrow,
} from "./issueCreation.model.js";

export const loadCriteriaWeightingModelOrThrow = async ({
  resolvedConfig,
  session,
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

export const validateCriteriaWeightingParametersOrThrow = ({
  criteriaWeightingModel,
  criteriaWeightingParameters,
  criterionNames,
}) => {
  return validateAndNormalizeModelParametersOrThrow({
    model: criteriaWeightingModel,
    paramValues: isPlainObject(criteriaWeightingParameters)
      ? criteriaWeightingParameters
      : {},
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
  session,
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
  criteriaWeightingModel,
  criteriaWeightingRuntime,
  criteriaWeightingParameters,
  apiModelsBaseUrl,
  httpClient,
}) => {
  if (!apiModelsBaseUrl || typeof apiModelsBaseUrl !== "string") {
    throw createInternalError("apiModelsBaseUrl is required for creator API model mode", {
      field: "apiModelsBaseUrl",
    });
  }

  if (!httpClient || typeof httpClient.post !== "function") {
    throw createInternalError("httpClient.post is required for creator API model mode", {
      field: "httpClient",
    });
  }

  const normalizedBaseUrl = apiModelsBaseUrl.replace(/\/+$/g, "");

  let response;
  try {
    response = await httpClient.post(
      `${normalizedBaseUrl}${criteriaWeightingRuntime.apiEndpoint.path}`,
      {
        modelParameters: criteriaWeightingParameters,
        evaluations: [
          {
            expert: {
              id: "creator",
              name: "Creator",
              email: "creator@local",
            },
            payload,
          },
        ],
        context: {
          issue: {
            id: "preview",
            name: "Issue creation preview",
            consensusThreshold: null,
            consensusMaxPhases: null,
          },
          criteria: criterionNames.map((criterionName, index) => ({
            id: String(index + 1),
            name: criterionName,
            type: null,
          })),
          consensusPhase: 1,
          previousStageResult: null,
          structure: {
            key: criteriaWeightingRuntime.criteriaWeightingStructureKey,
            stage: "criteriaWeighting",
          },
        },
      }
    );
  } catch (error) {
    throw createModelApiRequestError(
      error,
      `Failed to compute ${criteriaWeightingModel.name} weights`
    );
  }

  const result = unwrapModelApiResponse(
    response,
    `Failed to compute ${criteriaWeightingModel.name} weights`
  );

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
