export const WEIGHT_SUM_TOLERANCE = 1e-6;

export const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const resolveParameterKey = (parameter) =>
  normalizeNonEmptyString(parameter?.key);

export const countLeafCriteriaNodes = (nodes) => {
  if (!Array.isArray(nodes)) {
    return 0;
  }

  return nodes.reduce((count, node) => {
    const children = Array.isArray(node?.children) ? node.children : [];
    if (children.length === 0) {
      return count + 1;
    }

    return count + countLeafCriteriaNodes(children);
  }, 0);
};

const normalizeCriterionLeafMetadata = (node) => {
  const idCandidate =
    normalizeNonEmptyString(node?._id?.toString?.()) ||
    normalizeNonEmptyString(node?._id) ||
    normalizeNonEmptyString(node?.id?.toString?.()) ||
    normalizeNonEmptyString(node?.id);
  const nameCandidate =
    normalizeNonEmptyString(node?.name?.toString?.()) ||
    normalizeNonEmptyString(node?.name);

  if (!idCandidate && !nameCandidate) {
    return null;
  }

  return {
    id: idCandidate,
    name: nameCandidate,
  };
};

export const extractLeafCriteriaMetadata = (nodes) => {
  if (!Array.isArray(nodes)) {
    return [];
  }

  const leafCriteria = [];

  const traverse = (items) => {
    for (const item of items) {
      const children = Array.isArray(item?.children) ? item.children : [];
      if (children.length === 0) {
        const normalized = normalizeCriterionLeafMetadata(item);
        if (normalized) {
          leafCriteria.push(normalized);
        }
        continue;
      }

      traverse(children);
    }
  };

  traverse(nodes);
  return leafCriteria;
};

export const getValueType = (value) => {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
};

const valuesAreEqual = (left, right) => {
  if (typeof left === "number" && typeof right === "number") {
    return Object.is(left, right);
  }

  return JSON.stringify(left) === JSON.stringify(right);
};

export const isAllowedValue = (value, allowed) => {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) =>
      allowed.some((allowedItem) => valuesAreEqual(item, allowedItem))
    );
  }

  return allowed.some((allowedItem) => valuesAreEqual(value, allowedItem));
};

export const normalizeNumberValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

export const isWithinRange = (value, restrictions = {}) => {
  if (typeof restrictions.min === "number" && value < restrictions.min) {
    return false;
  }

  if (typeof restrictions.max === "number" && value > restrictions.max) {
    return false;
  }

  return true;
};

export const validateOrderedRule = (values, orderedRule) => {
  if (!orderedRule || values.length < 2) {
    return true;
  }

  if (orderedRule === "strictIncreasing") {
    for (let index = 1; index < values.length; index += 1) {
      if (!(values[index - 1] < values[index])) {
        return false;
      }
    }
    return true;
  }

  if (orderedRule === "nonDecreasing") {
    for (let index = 1; index < values.length; index += 1) {
      if (!(values[index - 1] <= values[index])) {
        return false;
      }
    }
    return true;
  }

  return false;
};

export const isMissingParameterValue = (value) =>
  value === undefined || value === null || value === "";

export const resolveExpectedArrayLength = ({
  parameter,
  leafCriteriaCount,
}) => {
  const scope = normalizeNonEmptyString(parameter?.scope);
  const configuredLength = parameter?.restrictions?.length;

  if (scope === "perCriterion") {
    return leafCriteriaCount;
  }

  if (typeof configuredLength === "number" && Number.isInteger(configuredLength)) {
    return configuredLength;
  }

  return null;
};

export const toInvalid = (message, value) => ({
  ok: false,
  message,
  value,
});

export const toValid = (value) => ({ ok: true, value });

export const buildEqualCrispWeights = (leafCriteriaCount) => {
  if (!Number.isInteger(leafCriteriaCount) || leafCriteriaCount <= 0) {
    return [];
  }

  if (leafCriteriaCount === 1) {
    return [1];
  }

  const weight = 1 / leafCriteriaCount;
  return Array.from({ length: leafCriteriaCount }, () => weight);
};

export const buildEqualFuzzyWeights = (leafCriteriaCount) => {
  const middleValues = buildEqualCrispWeights(leafCriteriaCount);
  return middleValues.map((middle) => {
    const spread = Math.min(0.05, middle * 0.5);
    const lower = Math.max(0, middle - spread);
    const upper = Math.min(1, middle + spread);
    return [lower, middle, upper];
  });
};
