import {
  createBadRequestError,
} from "../../../utils/common/errors.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../decisionEngine/modelParameters/index.js";

const CRITERIA_WEIGHT_SUM_TOLERANCE = 0.001;

const ensureLen = (arr, len, filler = null) => {
  const normalized = [...arr];

  if (normalized.length < len) {
    return [...normalized, ...Array(len - normalized.length).fill(filler)];
  }

  if (normalized.length > len) {
    return normalized.slice(0, len);
  }

  return normalized;
};

export const buildDefaultsResolved = ({ modelDoc, leafCount }) => {
  const resolved = {};
  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;
  const modelParameters = Array.isArray(modelDoc?.parameters)
    ? modelDoc.parameters
    : [];

  for (const parameter of modelParameters) {
    const { type, default: defaultValue } = parameter;
    const name = normalizeNonEmptyString(parameter.key);
    if (!name) continue;

    if (type === "number") {
      resolved[name] = defaultValue;
      continue;
    }

    if (type === "array") {
      const scope = normalizeNonEmptyString(parameter.scope);
      const fixedLength = parameter.restrictions?.length ?? null;
      const length =
        (scope === "perCriterion" ? leafCount : fixedLength) ??
        (defaultValue.length || 2);

      const isCriteriaWeights =
        ["criteriaWeights", "fuzzyCriteriaWeights"].includes(
          normalizeNonEmptyString(parameter.parameterStructureKey)
        );

      if (
        isCriteriaWeights &&
        typeof defaultValue === "string" &&
        defaultValue.trim().toLowerCase() === "equal" &&
        safeLeafCount > 0
      ) {
        const equalWeights = Array.from({ length: safeLeafCount }, () => 1 / safeLeafCount);
        resolved[name] = ensureLen(equalWeights, length, null);
        continue;
      }

      const base = defaultValue;
      resolved[name] = ensureLen(base, length, null);
      continue;
    }

    if (type === "fuzzyArray") {
      const scope = normalizeNonEmptyString(parameter.scope);
      const fixedLength = parameter.restrictions?.length ?? null;
      const length =
        (scope === "perCriterion" ? leafCount : fixedLength) ??
        (defaultValue.length || 1);

      const base = defaultValue;
      resolved[name] = ensureLen(base, length, [null, null, null]).map((triangle) =>
        triangle
      );
      continue;
    }

    resolved[name] = defaultValue;
  }

  if (modelDoc?.usesCriteriaWeights === true && safeLeafCount > 0) {
    if (modelDoc?.usesFuzzyCriteriaWeights === true) {
      const fuzzyValueCount = Number(modelDoc?.fuzzyWeightsValueCount);
      if (Number.isInteger(fuzzyValueCount) && fuzzyValueCount >= 2) {
        if (safeLeafCount === 1) {
          resolved.weights = [Array.from({ length: fuzzyValueCount }, () => 1)];
        } else {
          resolved.weights = Array.from({ length: safeLeafCount }, () =>
            Array.from({ length: fuzzyValueCount }, () => "")
          );
        }
      }
    } else {
      if (safeLeafCount === 1) {
        resolved.weights = [1];
      } else {
        const equalWeight = 1 / safeLeafCount;
        resolved.weights = Array.from({ length: safeLeafCount }, () => equalWeight);
      }
    }
  }

  return resolved;
};

export const mergeParamsResolved = ({ defaultsResolved, savedParams }) => {
  const merged = { ...defaultsResolved };

  for (const [key, value] of Object.entries(savedParams)) {
    merged[key] = value;
  }

  return merged;
};

export const normalizeScenarioParamOverridesOrThrow = (paramOverrides) => {
  if (paramOverrides == null) {
    return {};
  }

  if (typeof paramOverrides !== "object" || Array.isArray(paramOverrides)) {
    throw createBadRequestError("paramOverrides must be an object", {
      field: "paramOverrides",
    });
  }

  return paramOverrides;
};

export const normalizeCrispWeightsOrThrow = ({ rawWeights, criteriaCount }) => {
  if (!Array.isArray(rawWeights) || rawWeights.length === 0) {
    throw createBadRequestError(
      "Scenario model parameters must include criteria weights as an array",
      {
        field: "paramOverrides.weights",
      }
    );
  }

  if (rawWeights.length !== criteriaCount) {
    throw createBadRequestError(
      "Scenario model weights length must match the number of leaf criteria",
      {
        field: "paramOverrides.weights",
        details: {
          expected: criteriaCount,
          received: rawWeights.length,
        },
      }
    );
  }

  const normalizedWeights = rawWeights.map((value, index) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      throw createBadRequestError(
        `Scenario weight [${index}] must be a finite number`,
        {
          field: "paramOverrides.weights",
        }
      );
    }

    if (numericValue < 0 || numericValue > 1) {
      throw createBadRequestError(
        `Scenario weight [${index}] must be between 0 and 1`,
        {
          field: "paramOverrides.weights",
        }
      );
    }

    return numericValue;
  });

  const total = normalizedWeights.reduce((sum, value) => sum + value, 0);
  if (
    Math.abs(total - 1) >
    CRITERIA_WEIGHT_SUM_TOLERANCE + Number.EPSILON
  ) {
    throw createBadRequestError(
      "Scenario manual weights must sum to 1 (tolerance 0.001)",
      {
        field: "paramOverrides.weights",
      }
    );
  }

  return normalizedWeights;
};

export const resolveScenarioWeightsOrThrow = ({
  targetModel,
  paramOverrides,
  criteria,
}) => {
  if (targetModel?.usesCriteriaWeights !== true) {
    return null;
  }

  const criteriaCount = criteria.length;
  const rawWeights = paramOverrides?.weights;

  return normalizeCrispWeightsOrThrow({
    rawWeights,
    criteriaCount,
  });
};

export const buildScenarioParametersOrThrow = ({
  targetModel,
  paramOverrides,
  criteria,
  alternatives,
}) => {
  const normalizedOverrides = normalizeScenarioParamOverridesOrThrow(paramOverrides);
  const rawScenarioParams = { ...normalizedOverrides };
  delete rawScenarioParams.weights;

  const normalizedScenarioParameters =
    validateAndNormalizeModelParametersOrThrow({
      model: targetModel,
      paramValues: rawScenarioParams,
      criteriaNodes: criteria,
      alternativesCount: alternatives.length,
    });

  const resolvedWeights = resolveScenarioWeightsOrThrow({
    targetModel,
    paramOverrides: normalizedOverrides,
    criteria,
  });

  if (Array.isArray(resolvedWeights)) {
    normalizedScenarioParameters.weights = resolvedWeights;
  }

  return {
    paramsUsed: normalizedScenarioParameters,
    normalizedParams: normalizedScenarioParameters,
    weightsUsed: Array.isArray(resolvedWeights) ? resolvedWeights : [],
  };
};
