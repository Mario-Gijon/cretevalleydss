const toNonEmptyStringOrNull = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

const normalizeExpressionDomain = (expressionDomain) => {
  if (!expressionDomain || typeof expressionDomain !== "object" || Array.isArray(expressionDomain)) {
    return null;
  }

  return expressionDomain;
};

const normalizeModel = (model) => {
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    return null;
  }

  return {
    id: toNonEmptyStringOrNull(model.id ?? model._id),
    name: toNonEmptyStringOrNull(model.name ?? model.displayName),
    apiModelKey: toNonEmptyStringOrNull(model.apiModelKey),
  };
};

const normalizeAlternative = (alternative) => {
  if (!alternative || typeof alternative !== "object" || Array.isArray(alternative)) {
    return null;
  }

  const name = toNonEmptyStringOrNull(alternative.name);
  if (!name) {
    return null;
  }

  return {
    id: toNonEmptyStringOrNull(alternative.id ?? alternative._id),
    name,
  };
};

const normalizeCriterionNode = (criterion) => {
  if (!criterion || typeof criterion !== "object" || Array.isArray(criterion)) {
    return null;
  }

  const name = toNonEmptyStringOrNull(criterion.name);
  if (!name) {
    return null;
  }

  const children = Array.isArray(criterion.children)
    ? criterion.children.map(normalizeCriterionNode).filter(Boolean)
    : [];

  return {
    id: toNonEmptyStringOrNull(criterion.id ?? criterion._id),
    name,
    type: criterion.type ?? null,
    expressionDomain: normalizeExpressionDomain(criterion.expressionDomain),
    children,
  };
};

const normalizeLeafCriterion = (criterion) => {
  const normalizedCriterion = normalizeCriterionNode(criterion);

  if (!normalizedCriterion) {
    return null;
  }

  return {
    id: normalizedCriterion.id,
    name: normalizedCriterion.name,
    type: normalizedCriterion.type,
    expressionDomain: normalizedCriterion.expressionDomain,
  };
};

export const buildParameterContext = ({
  model = null,
  alternatives = [],
  criteriaTree = [],
  leafCriteria = [],
}) => ({
  model: normalizeModel(model),
  alternatives: alternatives.map(normalizeAlternative).filter(Boolean),
  criteriaTree: criteriaTree.map(normalizeCriterionNode).filter(Boolean),
  leafCriteria: leafCriteria.map(normalizeLeafCriterion).filter(Boolean),
});
