const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

const resolvePerCriterionScalarDefault = (parameter, defaultValue, length) => {
  if (Array.isArray(defaultValue)) return defaultValue;
  if (parameter?.scope !== "perCriterion") return defaultValue;

  return Array.from({ length }, () => defaultValue ?? "");
};

export const buildArrayDefault = ({ parameter, leafCount }) => {
  const restrictions = parameter?.restrictions || {};
  const defaultValue = parameter?.default;
  const length =
    getParameterExpectedLength(parameter, leafCount) ?? restrictions?.length ?? 2;

  if (restrictions?.min !== null && restrictions?.max !== null) {
    return (
      resolvePerCriterionScalarDefault(parameter, defaultValue, length) ??
      [restrictions.min, restrictions.max]
    );
  }

  return (
    resolvePerCriterionScalarDefault(parameter, defaultValue, length) ??
    Array(length).fill("")
  );
};

export const syncArrayValueWithExpectedLength = ({
  previousValue,
  parameter,
  leafCount,
}) => {
  const expectedLength = getParameterExpectedLength(parameter, leafCount);
  if (expectedLength === null) return previousValue;

  if (Array.isArray(previousValue) && previousValue.length === expectedLength) {
    return previousValue;
  }

  const defaultValue = parameter?.default;
  return Array.isArray(defaultValue)
    ? defaultValue.slice(0, expectedLength)
    : Array(expectedLength).fill(defaultValue ?? "");
};
