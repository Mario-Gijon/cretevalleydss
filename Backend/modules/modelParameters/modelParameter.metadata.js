export const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const resolveParameterKey = (parameter) => {
  return (
    normalizeNonEmptyString(parameter?.key) ||
    normalizeNonEmptyString(parameter?.name)
  );
};

export const resolveParameterScope = (parameter) =>
  normalizeNonEmptyString(parameter?.scope) || "global";

export const resolveParameterSemanticRole = (parameter) =>
  normalizeNonEmptyString(parameter?.semanticRole);

export const isCriterionWeightsParameter = ({ parameter }) =>
  resolveParameterSemanticRole(parameter) === "criteriaWeights";

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

export const resolveExpectedArrayLength = ({
  parameter,
  leafCriteriaCount,
  alternativesCount,
}) => {
  const scope = resolveParameterScope(parameter);
  const configuredLength = parameter?.restrictions?.length;

  if (scope === "perCriterion") {
    return leafCriteriaCount;
  }

  if (configuredLength === "matchCriteria") {
    return leafCriteriaCount;
  }

  if (configuredLength === "matchAlternatives") {
    return alternativesCount;
  }

  if (typeof configuredLength === "number" && Number.isInteger(configuredLength)) {
    return configuredLength;
  }

  if (Array.isArray(parameter?.default)) {
    return parameter.default.length;
  }

  return null;
};
