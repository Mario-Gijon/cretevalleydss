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
    modelKind: "criteriaWeighting",
    $and: [
      {
        $or: [
          { visibleInCriteriaWeighting: { $exists: false } },
          { visibleInCriteriaWeighting: { $ne: false } },
        ],
      },
      {
        $or: [
          { publicUsable: { $exists: false } },
          { publicUsable: { $ne: false } },
        ],
      },
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

  const creatorCriteriaWeightingEvaluationContext =
    buildCreatorCriteriaWeightingEvaluationContext({
      criteriaWeightingStructure,
      criteriaWeightingModel,
      normalizedCriteriaWeightingParameters: criteriaWeightingParameters,
      leafCriteria: criteria,
    });

  const normalizedCreatorPayload =
    await criteriaWeightingStructure.save({
      mode: "submit",
      payload,
      evaluationContext: creatorCriteriaWeightingEvaluationContext,
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

  const creatorCriteriaWeightingEvaluationContext =
    buildCreatorCriteriaWeightingEvaluationContext({
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
      criteria: creatorCriteriaWeightingEvaluationContext.leafCriteria.map(
        (criterion) => ({
          id: criterion.id,
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

  const normalizedWeightsByCriterion = criteria.reduce((accumulator, criterion) => {
    const criterionId = criterion.id;
    const criterionName = criterion.name;
    const numeric = Number(weightsByCriterion[criterionId]);
    if (!Number.isFinite(numeric)) {
      throw createBadRequestError(
        `${criteriaWeightingModel.name} output contains invalid weight for '${criterionName}'`,
        {
          field: "criteriaWeightingConfig.payload",
        }
      );
    }
    accumulator[criterionId] = numeric;
    return accumulator;
  }, {});

  const total = Object.values(normalizedWeightsByCriterion).reduce(
    (sum, value) => sum + value,
    0
  );
  if (!(total > 0)) {
    throw createBadRequestError(
      `${criteriaWeightingModel.name} output weights cannot be normalized`,
      {
        field: "criteriaWeightingConfig.payload",
      }
    );
  }

  return Object.fromEntries(
    Object.entries(normalizedWeightsByCriterion).map(([criterionId, value]) => [
      criterionId,
      value / total,
    ])
  );
};
