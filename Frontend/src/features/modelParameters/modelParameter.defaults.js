import {
  isCriteriaWeightsParameter,
  resolveLeafLengthForParameter,
  resolveParameterKey,
  resolveParameterScope,
} from "./modelParameter.metadata";

export const buildEqualWeights = (length) => {
  const safeLength = Math.max(Number(length) || 0, 1);
  if (safeLength === 1) return [1];

  const precision = 6;
  const factor = 10 ** precision;
  const base = Math.floor((1 / safeLength) * factor) / factor;
  const values = Array(safeLength).fill(base);
  const partial = values.slice(0, -1).reduce((sum, item) => sum + item, 0);
  values[safeLength - 1] = +(1 - partial).toFixed(precision);

  return values;
};

const resolvePerCriterionScalarDefault = (parameter, defaultValue, length) => {
  if (Array.isArray(defaultValue)) return defaultValue;
  if (resolveParameterScope(parameter) !== "perCriterion") return defaultValue;

  return Array.from({ length }, () => defaultValue ?? "");
};

export const buildCreateIssueParameterDefaults = ({
  selectedModel,
  leafCriteria,
}) => {
  const defaults = {};
  const leafCount = Array.isArray(leafCriteria) ? leafCriteria.length : 0;

  (selectedModel?.parameters || []).forEach((parameter) => {
    const type = parameter?.type;
    const restrictions = parameter?.restrictions || {};
    const defaultValue = parameter?.default;
    const key = resolveParameterKey(parameter);
    if (!key) return;

    if (type === "number") {
      defaults[key] = defaultValue ?? "";
      return;
    }

    if (type === "interval") {
      defaults[key] = Array.isArray(defaultValue)
        ? defaultValue
        : [restrictions?.min ?? "", restrictions?.max ?? ""];
      return;
    }

    if (type === "array") {
      const length =
        resolveLeafLengthForParameter(parameter, leafCount) ??
        restrictions?.length ??
        2;

      if (isCriteriaWeightsParameter(parameter) && defaultValue === "equal") {
        defaults[key] = buildEqualWeights(length);
        return;
      }

      if (restrictions?.min !== null && restrictions?.max !== null) {
        defaults[key] =
          resolvePerCriterionScalarDefault(parameter, defaultValue, length) ??
          [restrictions.min, restrictions.max];
        return;
      }

      defaults[key] =
        resolvePerCriterionScalarDefault(parameter, defaultValue, length) ??
        Array(length).fill("");
      return;
    }

    if (type === "fuzzyArray") {
      const length =
        resolveLeafLengthForParameter(parameter, leafCount) ??
        restrictions?.length ??
        1;

      if (isCriteriaWeightsParameter(parameter) && defaultValue === "equal") {
        const safeLength = Math.max(length, 1);
        const equalWeight = 1 / safeLength;
        const delta = 0.05;

        defaults[key] = Array(length)
          .fill(null)
          .map(() => [
            Math.max(0, +(equalWeight - delta).toFixed(2)),
            +equalWeight.toFixed(2),
            Math.min(1, +(equalWeight + delta).toFixed(2)),
          ]);
        return;
      }

      defaults[key] = Array.isArray(defaultValue)
        ? defaultValue
        : Array(length).fill([0, 0, 0]);
      return;
    }

    defaults[key] = defaultValue;
  });

  return defaults;
};

export const updateCreateIssueParameterValues = ({
  previous,
  selectedModel,
  leafCriteria,
}) => {
  const next = { ...(previous || {}) };
  const leafCount = Array.isArray(leafCriteria) ? leafCriteria.length : 0;

  (selectedModel?.parameters || []).forEach((parameter) => {
    const key = resolveParameterKey(parameter);
    if (!key) return;

    const type = parameter?.type;
    const expectedLength = resolveLeafLengthForParameter(parameter, leafCount);

    if (type === "array" && expectedLength !== null) {
      if (!Array.isArray(next[key]) || next[key].length !== expectedLength) {
        if (isCriteriaWeightsParameter(parameter)) {
          next[key] = buildEqualWeights(expectedLength);
        } else {
          const defaultValue = parameter?.default;
          next[key] = Array.isArray(defaultValue)
            ? defaultValue.slice(0, expectedLength)
            : Array(expectedLength).fill(defaultValue ?? "");
        }
      }
    }

    if (type === "fuzzyArray" && expectedLength !== null) {
      const isInvalid =
        !Array.isArray(next[key]) ||
        next[key].length !== expectedLength ||
        next[key].some((triangle) => !Array.isArray(triangle) || triangle.length !== 3);

      if (isInvalid) {
        if (isCriteriaWeightsParameter(parameter) && parameter?.default === "equal") {
          const safeLength = Math.max(expectedLength, 1);
          const equalWeight = 1 / safeLength;
          const delta = 0.05;

          next[key] = Array(expectedLength)
            .fill(null)
            .map(() => [
              Math.max(0, +(equalWeight - delta).toFixed(2)),
              +equalWeight.toFixed(2),
              Math.min(1, +(equalWeight + delta).toFixed(2)),
            ]);
        } else {
          const defaultValue = parameter?.default;
          next[key] = Array.isArray(defaultValue)
            ? defaultValue.slice(0, expectedLength)
            : Array(expectedLength).fill([0, 0, 0]);
        }
      }
    }
  });

  return next;
};
