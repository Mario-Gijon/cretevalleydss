const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasIdentifier = (value) =>
  (typeof value === "string" && value.trim() !== "") ||
  (typeof value === "number" && Number.isFinite(value));

const sameIdentifier = (left, right) =>
  hasIdentifier(left) &&
  hasIdentifier(right) &&
  String(left) === String(right);

const getWeight = (weights, identifier) => {
  if (!isObject(weights) || !hasIdentifier(identifier)) {
    return null;
  }

  const key = String(identifier);
  return Object.prototype.hasOwnProperty.call(weights, key)
    ? weights[key]
    : null;
};

export const getAlternatives = (decisionContext) =>
  Array.isArray(decisionContext?.alternatives)
    ? decisionContext.alternatives.slice()
    : [];

export const getLeafCriteria = (decisionContext) =>
  Array.isArray(decisionContext?.leafCriteria)
    ? decisionContext.leafCriteria.slice()
    : [];

export const getLeafCriteriaWithWeights = (decisionContext) =>
  getLeafCriteria(decisionContext).map((criterion) => ({
    ...criterion,
    weight: getCriterionWeight(decisionContext, criterion?.id),
  }));

export const getCriterionWeight = (decisionContext, criterionId) =>
  getWeight(decisionContext?.criteriaWeights, criterionId);

export const getCriterionExpressionDomain = (
  decisionContext,
  criterionId
) =>
  getLeafCriteria(decisionContext).find((criterion) =>
    sameIdentifier(criterion?.id, criterionId)
  )?.expressionDomain ?? null;

export const getExperts = (decisionContext) =>
  Array.isArray(decisionContext?.experts)
    ? decisionContext.experts.slice()
    : [];

export const getExpertsWithWeights = (decisionContext) =>
  getExperts(decisionContext).map((expert) => ({
    ...expert,
    weight: getExpertWeight(decisionContext, expert?.id),
  }));

export const getExpertWeight = (decisionContext, expertId) =>
  getWeight(decisionContext?.expertWeights, expertId);

export const getModelParameters = (decisionContext) =>
  isObject(decisionContext?.modelParameters)
    ? decisionContext.modelParameters
    : {};

export const getCriteriaWeightingParameters = (decisionContext) =>
  isObject(decisionContext?.criteriaWeightingParameters)
    ? decisionContext.criteriaWeightingParameters
    : {};
