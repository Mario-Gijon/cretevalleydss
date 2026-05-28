import {
  EVALUATION_STAGES,
  getEvaluationStructureOrThrow,
} from "../evaluations/index.js";
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
import {
  normalizeNonEmptyString,
  validateCriteriaWeightingModelRuntimeConfigOrThrow,
} from "./issueCreation.model.js";

const CRITERIA_WEIGHT_SUM_TOLERANCE = 0.001;

const MODE_CONFIGS = Object.freeze({
  creatorManual: Object.freeze({
    source: "creator",
    method: "manual",
    structureKey: "manualCriteriaWeights",
  }),
  expertManual: Object.freeze({
    source: "experts",
    method: "manual",
    structureKey: "manualCriteriaWeights",
  }),
  creatorApiModel: Object.freeze({
    source: "creator",
    method: "apiModel",
    structureKey: null,
  }),
  expertApiModel: Object.freeze({
    source: "experts",
    method: "apiModel",
    structureKey: null,
  }),
  creatorFuzzy: Object.freeze({
    source: "creator",
    method: "fuzzy",
    structureKey: null,
  }),
});

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const ensureCriteriaNamesOrThrow = (criterionNames) => {
  if (!Array.isArray(criterionNames) || criterionNames.length === 0) {
    throw createInternalError("Issue has no leaf criteria", {
      field: "criteria",
    });
  }
};

const usesCriteriaWeights = (model) => model.usesCriteriaWeights;

const usesFuzzyCriteriaWeights = (model) =>
  usesCriteriaWeights(model) && model.usesFuzzyCriteriaWeights;

export const resolveFuzzyCriteriaWeightValueCountOrThrow = ({
  model,
  domainDocs,
}) => {
  if (!model.usesFuzzyCriteriaWeights) {
    return null;
  }

  const linguisticDomains = domainDocs.filter(
    (domain) => domain.type === "linguistic"
  );

  if (linguisticDomains.length === 0) {
    throw createBadRequestError(
      "Fuzzy criteria weights require linguistic expression domains",
      {
        field: "expressionDomainConfig",
      }
    );
  }

  const valueCounts = new Set();

  for (const domain of linguisticDomains) {
    const valueCount = Number(domain.valueCount);
    if (!Number.isInteger(valueCount) || valueCount < 2) {
      throw createBadRequestError(
        "Fuzzy criteria weights require a valid linguistic valueCount",
        {
          field: "expressionDomainConfig",
        }
      );
    }

    valueCounts.add(valueCount);
  }

  if (valueCounts.size !== 1) {
    throw createBadRequestError(
      "Fuzzy criteria weights require consistent linguistic valueCount across issue domains",
      {
        field: "expressionDomainConfig",
      }
    );
  }

  return Array.from(valueCounts)[0];
};

const normalizeCreatorFuzzyWeightsOrThrow = ({
  payload,
  criterionNames,
  valueCount,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload must be an object for creatorFuzzy mode",
      {
        field: "criteriaWeightingConfig.payload",
      }
    );
  }

  const weightsByCriterion = payload.weightsByCriterion;
  if (!isPlainObject(weightsByCriterion)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload.weightsByCriterion must be an object",
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  const expectedCriterionSet = new Set(criterionNames);
  const unknownKeys = Object.keys(weightsByCriterion).filter(
    (criterionName) => !expectedCriterionSet.has(criterionName)
  );

  if (unknownKeys.length > 0) {
    throw createBadRequestError(
      `Unknown criteria in creator fuzzy weights: ${unknownKeys.join(", ")}`,
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  return criterionNames.map((criterionName) => {
    const value = weightsByCriterion[criterionName];

    if (!Array.isArray(value) || value.length !== valueCount) {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' must be an array with length ${valueCount}`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    const fuzzyValues = value.map(Number);
    if (fuzzyValues.some((item) => !Number.isFinite(item))) {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' must contain finite numbers`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    if (fuzzyValues.some((item) => item < 0 || item > 1)) {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' values must be in [0, 1]`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    for (let index = 1; index < fuzzyValues.length; index += 1) {
      if (fuzzyValues[index] < fuzzyValues[index - 1]) {
        throw createBadRequestError(
          `Fuzzy weight for criterion '${criterionName}' must be non-decreasing`,
          {
            field: "criteriaWeightingConfig.payload.weightsByCriterion",
          }
        );
      }
    }

    return fuzzyValues;
  });
};

const normalizeCreatorManualWeightsOrThrow = ({ payload, criterionNames }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload must be an object for creatorManual mode",
      {
        field: "criteriaWeightingConfig.payload",
      }
    );
  }

  const weightsByCriterion = payload.weightsByCriterion;
  if (!isPlainObject(weightsByCriterion)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload.weightsByCriterion must be an object",
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  const expectedCriterionSet = new Set(criterionNames);
  const unknownKeys = Object.keys(weightsByCriterion).filter(
    (criterionName) => !expectedCriterionSet.has(criterionName)
  );

  if (unknownKeys.length > 0) {
    throw createBadRequestError(
      `Unknown criteria in creator manual weights: ${unknownKeys.join(", ")}`,
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  const weights = criterionNames.map((criterionName) => {
    const rawValue = weightsByCriterion[criterionName];
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      throw createBadRequestError(
        `Weight for criterion '${criterionName}' must be a finite number`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    if (numericValue < 0 || numericValue > 1) {
      throw createBadRequestError(
        `Weight for criterion '${criterionName}' must be between 0 and 1`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    return numericValue;
  });

  const total = weights.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > CRITERIA_WEIGHT_SUM_TOLERANCE) {
    throw createBadRequestError(
      "Creator manual weights must sum to 1 (tolerance 0.001)",
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  return weights;
};

const resolveModeConfigOrThrow = (rawConfig) => {
  if (!isPlainObject(rawConfig)) {
    throw createBadRequestError("criteriaWeightingConfig is required", {
      field: "criteriaWeightingConfig",
    });
  }

  const mode = normalizeNonEmptyString(rawConfig.mode);
  if (!mode) {
    throw createBadRequestError("criteriaWeightingConfig.mode is required", {
      field: "criteriaWeightingConfig.mode",
    });
  }

  const modeConfig = MODE_CONFIGS[mode];
  if (!modeConfig) {
    throw createBadRequestError(`Unsupported criteria weighting mode: ${mode}`, {
      field: "criteriaWeightingConfig.mode",
    });
  }

  const source = normalizeNonEmptyString(rawConfig.source);
  const method = normalizeNonEmptyString(rawConfig.method);
  const structureKey = normalizeNonEmptyString(rawConfig.structureKey);

  if (source && source !== modeConfig.source) {
    throw createBadRequestError(
      `criteriaWeightingConfig.source must be '${modeConfig.source}' for mode '${mode}'`,
      {
        field: "criteriaWeightingConfig.source",
      }
    );
  }

  if (method && method !== modeConfig.method) {
    throw createBadRequestError(
      `criteriaWeightingConfig.method must be '${modeConfig.method}' for mode '${mode}'`,
      {
        field: "criteriaWeightingConfig.method",
      }
    );
  }

  if (
    structureKey &&
    modeConfig.structureKey &&
    structureKey !== modeConfig.structureKey
  ) {
    throw createBadRequestError(
      `criteriaWeightingConfig.structureKey must be '${modeConfig.structureKey}' for mode '${mode}'`,
      {
        field: "criteriaWeightingConfig.structureKey",
      }
    );
  }

  return {
    mode,
    source: modeConfig.source,
    method: modeConfig.method,
    structureKey: modeConfig.structureKey,
    payload: isPlainObject(rawConfig.payload) ? rawConfig.payload : {},
    criteriaWeightingModelKey: normalizeNonEmptyString(
      rawConfig.criteriaWeightingModelKey
    ),
    criteriaWeightingModelId: normalizeNonEmptyString(
      rawConfig.criteriaWeightingModelId
    ),
  };
};

const loadCriteriaWeightingModelOrThrow = async ({
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

const resolveCreatorApiCriteriaWeightingModelWeightsOrThrow = async ({
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

const validateCriteriaWeightingParametersOrThrow = ({
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

export const resolveCriteriaWeightingConfigOrThrow = async ({
  criteriaWeightingConfig,
  criteriaWeightingParameters,
  criterionNames,
  isSingleLeafCriterion,
  model,
  fuzzyValueCount = null,
  apiModelsBaseUrl,
  httpClient,
  session,
}) => {
  ensureCriteriaNamesOrThrow(criterionNames);

  if (!usesCriteriaWeights(model)) {
    return {
      criteriaWeightingStructureKey: null,
      criteriaWeightingModel: null,
      criteriaWeightingApiModelKey: null,
      criteriaWeightingApiEndpoint: null,
      criteriaWeightingParameters: {},
      modelWeights: null,
      currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      isCriteriaWeightingRequired: false,
    };
  }

  const resolvedConfig = resolveModeConfigOrThrow(criteriaWeightingConfig);
  const fuzzyModel = usesFuzzyCriteriaWeights(model);

  if (fuzzyModel && resolvedConfig.mode !== "creatorFuzzy") {
    throw createBadRequestError("Fuzzy models require fuzzy criteria weights", {
      field: "criteriaWeightingConfig.mode",
    });
  }

  if (!fuzzyModel && resolvedConfig.mode === "creatorFuzzy") {
    throw createBadRequestError(
      "Fuzzy criteria weights are only available for fuzzy models",
      {
        field: "criteriaWeightingConfig.mode",
      }
    );
  }

  let criteriaWeightingModel = null;
  let criteriaWeightingRuntime = null;
  let normalizedCriteriaWeightingParameters = {};

  if (resolvedConfig.method === "apiModel") {
    criteriaWeightingModel = await loadCriteriaWeightingModelOrThrow({
      resolvedConfig,
      session,
    });
    criteriaWeightingRuntime =
      validateCriteriaWeightingModelRuntimeConfigOrThrow(criteriaWeightingModel);
    normalizedCriteriaWeightingParameters = validateCriteriaWeightingParametersOrThrow({
      criteriaWeightingModel,
      criteriaWeightingParameters,
      criterionNames,
    });
  }

  const resolvedStructureKey =
    resolvedConfig.method === "apiModel"
      ? criteriaWeightingRuntime.criteriaWeightingStructureKey
      : resolvedConfig.structureKey;

  if (resolvedStructureKey) {
    const criteriaWeightingStructure = getEvaluationStructureOrThrow(
      resolvedStructureKey
    );

    if (criteriaWeightingStructure.stage !== EVALUATION_STAGES.CRITERIA_WEIGHTING) {
      throw createBadRequestError(
        `Evaluation structure '${criteriaWeightingStructure.key}' does not support stage '${EVALUATION_STAGES.CRITERIA_WEIGHTING}'`,
        {
          code: "EVALUATION_STRUCTURE_STAGE_MISMATCH",
          field: "criteriaWeightingConfig.mode",
        }
      );
    }
  }

  if (resolvedConfig.mode === "creatorFuzzy") {
    if (!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2) {
      throw createBadRequestError(
        "Fuzzy criteria weights require a valid linguistic valueCount from issue domains",
        {
          field: "criteriaWeightingConfig.mode",
        }
      );
    }

    if (isSingleLeafCriterion) {
      return {
        criteriaWeightingStructureKey: resolvedStructureKey,
        criteriaWeightingModel: null,
        criteriaWeightingApiModelKey: null,
        criteriaWeightingApiEndpoint: null,
        criteriaWeightingParameters: {},
        modelWeights: [Array.from({ length: fuzzyValueCount }, () => 1)],
        currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        isCriteriaWeightingRequired: false,
      };
    }

    const modelWeights = normalizeCreatorFuzzyWeightsOrThrow({
      payload: resolvedConfig.payload,
      criterionNames,
      valueCount: fuzzyValueCount,
    });

    return {
      criteriaWeightingStructureKey: resolvedStructureKey,
      criteriaWeightingModel: null,
      criteriaWeightingApiModelKey: null,
      criteriaWeightingApiEndpoint: null,
      criteriaWeightingParameters: {},
      modelWeights,
      currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      isCriteriaWeightingRequired: false,
    };
  }

  if (isSingleLeafCriterion) {
    const fixedWeights =
      fuzzyModel && Number.isInteger(fuzzyValueCount) && fuzzyValueCount >= 2
        ? [Array.from({ length: fuzzyValueCount }, () => 1)]
        : [1];

    return {
      criteriaWeightingStructureKey: resolvedStructureKey,
      criteriaWeightingModel,
      criteriaWeightingApiModelKey: criteriaWeightingRuntime?.apiModelKey || null,
      criteriaWeightingApiEndpoint: criteriaWeightingRuntime?.apiEndpoint || null,
      criteriaWeightingParameters:
        resolvedConfig.method === "apiModel"
          ? normalizedCriteriaWeightingParameters
          : {},
      modelWeights: fixedWeights,
      currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      isCriteriaWeightingRequired: false,
    };
  }

  if (resolvedConfig.source === "experts") {
    return {
      criteriaWeightingStructureKey: resolvedStructureKey,
      criteriaWeightingModel,
      criteriaWeightingApiModelKey: criteriaWeightingRuntime?.apiModelKey || null,
      criteriaWeightingApiEndpoint: criteriaWeightingRuntime?.apiEndpoint || null,
      criteriaWeightingParameters:
        resolvedConfig.method === "apiModel"
          ? normalizedCriteriaWeightingParameters
          : {},
      modelWeights: null,
      currentStage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      isCriteriaWeightingRequired: true,
    };
  }

  let modelWeights = null;

  if (resolvedConfig.method === "manual") {
    modelWeights = normalizeCreatorManualWeightsOrThrow({
      payload: resolvedConfig.payload,
      criterionNames,
    });
  } else if (resolvedConfig.method === "apiModel") {
    modelWeights = await resolveCreatorApiCriteriaWeightingModelWeightsOrThrow({
      payload: resolvedConfig.payload,
      criterionNames,
      criteriaWeightingModel,
      criteriaWeightingRuntime,
      criteriaWeightingParameters: normalizedCriteriaWeightingParameters,
      apiModelsBaseUrl,
      httpClient,
    });
  } else {
    throw createBadRequestError(
      `Unsupported criteria weighting method: ${resolvedConfig.method}`,
      {
        field: "criteriaWeightingConfig.method",
      }
    );
  }

  return {
    criteriaWeightingStructureKey: resolvedStructureKey,
    criteriaWeightingModel,
    criteriaWeightingApiModelKey: criteriaWeightingRuntime?.apiModelKey || null,
    criteriaWeightingApiEndpoint: criteriaWeightingRuntime?.apiEndpoint || null,
    criteriaWeightingParameters:
      resolvedConfig.method === "apiModel"
        ? normalizedCriteriaWeightingParameters
        : {},
    modelWeights,
    currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    isCriteriaWeightingRequired: false,
  };
};
