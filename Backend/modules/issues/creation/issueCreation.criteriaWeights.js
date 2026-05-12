import {
  EVALUATION_STAGES,
  getEvaluationStructureForStageOrThrow,
} from "../evaluations/index.js";
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
  resolveCriteriaWeightingAggregationModeOrThrow,
} from "./issueCreation.model.js";

const CRITERIA_WEIGHT_SUM_TOLERANCE = 0.001;

const MODE_CONFIGS = Object.freeze({
  creatorManual: Object.freeze({
    source: "creator",
    method: "manual",
    aggregationMode: "none",
    structureKey: "manualCriteriaWeights",
  }),
  expertManual: Object.freeze({
    source: "experts",
    method: "manual",
    aggregationMode: "mean",
    structureKey: "manualCriteriaWeights",
  }),
  creatorBwm: Object.freeze({
    source: "creator",
    method: "bwm",
    aggregationMode: "none",
    structureKey: "bestWorstCriteria",
  }),
  expertBwm: Object.freeze({
    source: "experts",
    method: "bwm",
    aggregationMode: "bwmMean",
    structureKey: "bestWorstCriteria",
  }),
  expertBwmCmcc: Object.freeze({
    source: "experts",
    method: "bwm",
    aggregationMode: "cmccSimulation",
    structureKey: "bestWorstCriteria",
  }),
  creatorFuzzy: Object.freeze({
    source: "creator",
    method: "fuzzy",
    aggregationMode: "none",
    structureKey: "fuzzyCriteriaWeights",
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

const isFuzzyCriteriaWeightModel = (model) => {
  const apiModelKey = normalizeNonEmptyString(model?.apiModelKey)?.toLowerCase();
  if (apiModelKey === "fuzzy_topsis") {
    return true;
  }

  const criteriaWeightParameter = (Array.isArray(model?.parameters)
    ? model.parameters
    : []
  ).find(
    (parameter) =>
      normalizeNonEmptyString(parameter?.semanticRole) === "criteriaWeights"
  );

  if (!criteriaWeightParameter) {
    return false;
  }

  return normalizeNonEmptyString(criteriaWeightParameter?.type) === "fuzzyArray";
};

const resolveFuzzyValueCount = (model) => {
  const criteriaWeightParameter = (Array.isArray(model?.parameters)
    ? model.parameters
    : []
  ).find(
    (parameter) =>
      normalizeNonEmptyString(parameter?.semanticRole) === "criteriaWeights"
  );

  const restrictionsLength = Number(criteriaWeightParameter?.restrictions?.length);
  if (Number.isInteger(restrictionsLength) && restrictionsLength >= 2) {
    return restrictionsLength;
  }

  const valueCount = Number(criteriaWeightParameter?.valueCount);
  if (Number.isInteger(valueCount) && valueCount >= 2) {
    return valueCount;
  }

  return 3;
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

const normalizeBwmComparisonsMapOrThrow = ({
  value,
  criterionNames,
  field,
}) => {
  if (!isPlainObject(value)) {
    throw createBadRequestError(`${field} must be an object`, {
      field,
    });
  }

  const unknownKeys = Object.keys(value).filter(
    (criterionName) => !criterionNames.includes(criterionName)
  );
  if (unknownKeys.length > 0) {
    throw createBadRequestError(
      `Unknown criteria in ${field}: ${unknownKeys.join(", ")}`,
      {
        field,
      }
    );
  }

  return criterionNames.reduce((accumulator, criterionName) => {
    const numericValue = Number(value[criterionName]);

    if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 9) {
      throw createBadRequestError(
        `${field}.${criterionName} must be a finite number between 1 and 9`,
        {
          field,
        }
      );
    }

    accumulator[criterionName] = numericValue;
    return accumulator;
  }, {});
};

const normalizeCreatorBwmPayloadOrThrow = ({ payload, criterionNames }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload must be an object for creatorBwm mode",
      {
        field: "criteriaWeightingConfig.payload",
      }
    );
  }

  const bestCriterion = normalizeNonEmptyString(payload.bestCriterion);
  const worstCriterion = normalizeNonEmptyString(payload.worstCriterion);

  if (!bestCriterion) {
    throw createBadRequestError("bestCriterion is required", {
      field: "criteriaWeightingConfig.payload.bestCriterion",
    });
  }

  if (!worstCriterion) {
    throw createBadRequestError("worstCriterion is required", {
      field: "criteriaWeightingConfig.payload.worstCriterion",
    });
  }

  if (!criterionNames.includes(bestCriterion)) {
    throw createBadRequestError("bestCriterion must be a valid criterion name", {
      field: "criteriaWeightingConfig.payload.bestCriterion",
    });
  }

  if (!criterionNames.includes(worstCriterion)) {
    throw createBadRequestError("worstCriterion must be a valid criterion name", {
      field: "criteriaWeightingConfig.payload.worstCriterion",
    });
  }

  if (criterionNames.length > 1 && bestCriterion === worstCriterion) {
    throw createBadRequestError(
      "bestCriterion and worstCriterion must be different",
      {
        field: "criteriaWeightingConfig.payload.worstCriterion",
      }
    );
  }

  const bestToOthers = normalizeBwmComparisonsMapOrThrow({
    value: payload.bestToOthers,
    criterionNames,
    field: "criteriaWeightingConfig.payload.bestToOthers",
  });
  const othersToWorst = normalizeBwmComparisonsMapOrThrow({
    value: payload.othersToWorst,
    criterionNames,
    field: "criteriaWeightingConfig.payload.othersToWorst",
  });

  bestToOthers[bestCriterion] = 1;
  othersToWorst[worstCriterion] = 1;

  return {
    bestCriterion,
    worstCriterion,
    bestToOthers,
    othersToWorst,
  };
};

const normalizeBwmResultWeightsOrThrow = ({ weights, criterionCount }) => {
  if (!Array.isArray(weights) || weights.length < criterionCount) {
    throw createBadRequestError("ApiModels BWM output does not contain valid weights", {
      field: "criteriaWeightingConfig.payload",
    });
  }

  const baseWeights = weights.slice(0, criterionCount).map(Number);
  if (baseWeights.some((value) => !Number.isFinite(value))) {
    throw createBadRequestError("ApiModels BWM output contains invalid weights", {
      field: "criteriaWeightingConfig.payload",
    });
  }

  const total = baseWeights.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) {
    throw createBadRequestError("ApiModels BWM output weights cannot be normalized", {
      field: "criteriaWeightingConfig.payload",
    });
  }

  return baseWeights.map((value) => value / total);
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
  const aggregationMode = normalizeNonEmptyString(rawConfig.aggregationMode);
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

  if (aggregationMode && aggregationMode !== modeConfig.aggregationMode) {
    throw createBadRequestError(
      `criteriaWeightingConfig.aggregationMode must be '${modeConfig.aggregationMode}' for mode '${mode}'`,
      {
        field: "criteriaWeightingConfig.aggregationMode",
      }
    );
  }

  if (structureKey && structureKey !== modeConfig.structureKey) {
    throw createBadRequestError(
      `criteriaWeightingConfig.structureKey must be '${modeConfig.structureKey}' for mode '${mode}'`,
      {
        field: "criteriaWeightingConfig.structureKey",
      }
    );
  }

  const resolvedAggregationMode = resolveCriteriaWeightingAggregationModeOrThrow(
    modeConfig.aggregationMode
  );

  return {
    mode,
    source: modeConfig.source,
    method: modeConfig.method,
    structureKey: modeConfig.structureKey,
    aggregationMode: resolvedAggregationMode,
    payload: isPlainObject(rawConfig.payload) ? rawConfig.payload : {},
  };
};

const resolveCreatorBwmWeightsOrThrow = async ({
  payload,
  criterionNames,
  apiModelsBaseUrl,
  httpClient,
}) => {
  if (!apiModelsBaseUrl || typeof apiModelsBaseUrl !== "string") {
    throw createInternalError("apiModelsBaseUrl is required for creator BWM mode", {
      field: "apiModelsBaseUrl",
    });
  }

  if (!httpClient || typeof httpClient.post !== "function") {
    throw createInternalError("httpClient.post is required for creator BWM mode", {
      field: "httpClient",
    });
  }

  const normalizedPayload = normalizeCreatorBwmPayloadOrThrow({
    payload,
    criterionNames,
  });

  const expertsData = {
    creator: {
      mic: criterionNames.map(
        (criterionName) => Number(normalizedPayload.bestToOthers[criterionName])
      ),
      lic: criterionNames.map(
        (criterionName) => Number(normalizedPayload.othersToWorst[criterionName])
      ),
    },
  };

  const normalizedBaseUrl = apiModelsBaseUrl.replace(/\/+$/g, "");

  let response;
  try {
    response = await httpClient.post(`${normalizedBaseUrl}/bwm`, {
      experts_data: expertsData,
      eps_penalty: 1,
    });
  } catch (error) {
    throw createModelApiRequestError(error, "Failed to compute BWM weights");
  }

  const result = unwrapModelApiResponse(response, "Failed to compute BWM weights");
  return normalizeBwmResultWeightsOrThrow({
    weights: result?.weights,
    criterionCount: criterionNames.length,
  });
};

export const resolveCriteriaWeightingConfigOrThrow = async ({
  criteriaWeightingConfig,
  criterionNames,
  isSingleLeafCriterion,
  model,
  apiModelsBaseUrl,
  httpClient,
}) => {
  ensureCriteriaNamesOrThrow(criterionNames);

  const resolvedConfig = resolveModeConfigOrThrow(criteriaWeightingConfig);
  const fuzzyModel = isFuzzyCriteriaWeightModel(model);

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

  if (resolvedConfig.mode === "expertBwmCmcc") {
    throw createBadRequestError(
      "BWM simulated consensus is not implemented yet",
      {
        field: "criteriaWeightingConfig.mode",
      }
    );
  }

  getEvaluationStructureForStageOrThrow({
    structureKey: resolvedConfig.structureKey,
    stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  });

  if (resolvedConfig.mode === "creatorFuzzy") {
    const fuzzyValueCount = resolveFuzzyValueCount(model);
    const modelWeights = normalizeCreatorFuzzyWeightsOrThrow({
      payload: resolvedConfig.payload,
      criterionNames,
      valueCount: fuzzyValueCount,
    });

    return {
      criteriaWeightingStructureKey: resolvedConfig.structureKey,
      criteriaWeightingAggregationMode: "none",
      modelWeights,
      currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      isCriteriaWeightingRequired: false,
    };
  }

  if (isSingleLeafCriterion) {
    return {
      criteriaWeightingStructureKey: resolvedConfig.structureKey,
      criteriaWeightingAggregationMode: "none",
      modelWeights: [1],
      currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      isCriteriaWeightingRequired: false,
    };
  }

  if (resolvedConfig.source === "experts") {
    return {
      criteriaWeightingStructureKey: resolvedConfig.structureKey,
      criteriaWeightingAggregationMode: resolvedConfig.aggregationMode,
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
  } else if (resolvedConfig.method === "bwm") {
    modelWeights = await resolveCreatorBwmWeightsOrThrow({
      payload: resolvedConfig.payload,
      criterionNames,
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
    criteriaWeightingStructureKey: resolvedConfig.structureKey,
    criteriaWeightingAggregationMode: "none",
    modelWeights,
    currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    isCriteriaWeightingRequired: false,
  };
};
