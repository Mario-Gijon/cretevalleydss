import { getExpressionDomainNumericRange } from "../../../utils/expressionDomains.js";
import { getExpressionDomainAssignmentsByCriterion } from "../../../utils/domainAssignments.utils.js";

const toNonEmptyStringOrNull = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)])
    );
  }
  return value;
};

const normalizeExpressionDomain = (expressionDomain) => {
  if (!expressionDomain || typeof expressionDomain !== "object" || Array.isArray(expressionDomain)) {
    return null;
  }

  const id = toNonEmptyStringOrNull(expressionDomain.id ?? expressionDomain._id);
  const typeKey = toNonEmptyStringOrNull(
    expressionDomain.typeKey ?? expressionDomain.type?.key
  );
  const definition = expressionDomain.definition && typeof expressionDomain.definition === "object"
    ? cloneValue(expressionDomain.definition)
    : {};
  const { min, max, step } = getExpressionDomainNumericRange({ typeKey, definition });

  return {
    id,
    name: toNonEmptyStringOrNull(expressionDomain.name) || id,
    typeKey,
    definition: {
      ...definition,
      ...(min !== null ? { min } : {}),
      ...(max !== null ? { max } : {}),
      ...(step !== null ? { step } : {}),
    },
  };
};

const normalizeParameterDefinition = (parameter) => {
  if (!parameter || typeof parameter !== "object" || Array.isArray(parameter)) {
    return null;
  }
  const key = toNonEmptyStringOrNull(parameter.key);
  const parameterStructureKey = toNonEmptyStringOrNull(parameter.parameterStructureKey);
  if (!key || !parameterStructureKey) return null;
  return {
    key,
    parameterStructureKey,
    label: toNonEmptyStringOrNull(parameter.label) || key,
    ...(parameter.default !== undefined ? { default: cloneValue(parameter.default) } : {}),
  };
};

const normalizeModel = (model, parameterDefinitions) => {
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    return null;
  }

  return {
    id: toNonEmptyStringOrNull(model.id ?? model._id),
    name: toNonEmptyStringOrNull(model.name ?? model.displayName),
    apiModelKey: toNonEmptyStringOrNull(model.apiModelKey),
    parameters: parameterDefinitions,
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

const buildCriterionDomainsById = ({
  leafCriteria,
  criterionDomainsById,
  expressionDomainConfig,
  expressionDomains,
}) => {
  const domainsById = new Map(
    (Array.isArray(expressionDomains) ? expressionDomains : [])
      .map((domain) => [
        toNonEmptyStringOrNull(domain?.id ?? domain?._id),
        normalizeExpressionDomain(domain),
      ])
      .filter(([id, domain]) => id && domain)
  );
  const result = {};

  (Array.isArray(leafCriteria) ? leafCriteria : []).forEach((criterion) => {
    const id = toNonEmptyStringOrNull(criterion?.id ?? criterion?._id);
    const explicitDomain = criterionDomainsById?.[id];
    const assignedDomainId = getExpressionDomainAssignmentsByCriterion({
      expressionDomainConfig,
      leafCriteria: [criterion],
    })[String(criterion?.name || "").trim()];
    const domain = normalizeExpressionDomain(explicitDomain)
      || domainsById.get(assignedDomainId)
      || normalizeExpressionDomain(criterion?.expressionDomain);
    if (id && domain) result[id] = domain;
  });

  return result;
};

const buildParameterValuesByStructureKey = (parameterDefinitions, parameterValues) => {
  const result = {};
  parameterDefinitions.forEach((parameter) => {
    const currentValue = Object.hasOwn(parameterValues, parameter.key)
      ? parameterValues[parameter.key]
      : parameter.default;
    if (currentValue === undefined) return;
    if (!result[parameter.parameterStructureKey]) {
      result[parameter.parameterStructureKey] = [];
    }
    result[parameter.parameterStructureKey].push({
      key: parameter.key,
      value: cloneValue(currentValue),
    });
  });
  return result;
};

export const buildParameterContext = ({
  model = null,
  alternatives = [],
  criteriaTree = [],
  leafCriteria = [],
  parameterDefinitions = [],
  parameterValues = {},
  selectedExpertCount = 0,
  criterionDomainsById = null,
  expressionDomainConfig = null,
  expressionDomains = [],
}) => {
  const normalizedLeafCriteria = leafCriteria.map(normalizeLeafCriterion).filter(Boolean);
  const definitions = (Array.isArray(parameterDefinitions) ? parameterDefinitions : [])
    .map(normalizeParameterDefinition)
    .filter(Boolean);
  const values = parameterValues && typeof parameterValues === "object" && !Array.isArray(parameterValues)
    ? cloneValue(parameterValues)
    : {};

  return {
    model: normalizeModel(model, definitions),
    alternatives: alternatives.map(normalizeAlternative).filter(Boolean),
    criteriaTree: criteriaTree.map(normalizeCriterionNode).filter(Boolean),
    leafCriteria: normalizedLeafCriteria,
    parameterDefinitions: definitions,
    parameterValues: values,
    selectedExpertCount: Number.isInteger(selectedExpertCount) && selectedExpertCount >= 0
      ? selectedExpertCount
      : 0,
    parameterValuesByStructureKey: buildParameterValuesByStructureKey(definitions, values),
    criterionDomainsById: buildCriterionDomainsById({
      leafCriteria: normalizedLeafCriteria,
      criterionDomainsById,
      expressionDomainConfig,
      expressionDomains,
    }),
  };
};

export const getParameterValueByStructureKey = (parameterContext, structureKey) => {
  const values = parameterContext?.parameterValuesByStructureKey?.[structureKey];
  return Array.isArray(values) && values.length === 1 ? values[0].value : null;
};
