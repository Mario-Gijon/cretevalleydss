import {
  MATCH_LENGTH,
  PARAMETER_SCOPE,
  PARAMETER_SEMANTIC_ROLE,
} from "./constants";

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const resolveParameterKey = (parameter) =>
  parameter?.key || parameter?.name || null;

export const resolveParameterScope = (parameter) =>
  normalizeNonEmptyString(parameter?.scope) || PARAMETER_SCOPE.GLOBAL;

export const resolveParameterSemanticRole = (parameter) =>
  normalizeNonEmptyString(parameter?.semanticRole);

export const isCriteriaWeightsParameter = (parameter) =>
  resolveParameterSemanticRole(parameter) ===
  PARAMETER_SEMANTIC_ROLE.CRITERIA_WEIGHTS;

export const resolveLeafLengthForParameter = (parameter, leafCount) => {
  const scope = resolveParameterScope(parameter);
  const restrictions = parameter?.restrictions || {};

  if (scope === PARAMETER_SCOPE.PER_CRITERION) {
    return leafCount;
  }

  if (restrictions.length === MATCH_LENGTH.CRITERIA) {
    return leafCount;
  }

  if (typeof restrictions.length === "number") {
    return restrictions.length;
  }

  return null;
};

export const resolveRegistryKey = (parameter) => {
  if (isCriteriaWeightsParameter(parameter)) {
    return "criteriaWeights";
  }

  const component = normalizeNonEmptyString(parameter?.ui?.component);
  if (component) {
    return component;
  }

  const type = normalizeNonEmptyString(parameter?.type) || "unknown";
  const scope = resolveParameterScope(parameter);
  return `${type}:${scope}`;
};
