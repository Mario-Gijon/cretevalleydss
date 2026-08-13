import { isPlainObject } from "../../../utils/common/objects";

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const hasOwnKey = (value, key) =>
  value !== null &&
  typeof value === "object" &&
  Object.prototype.hasOwnProperty.call(value, key);

const cloneJsonCompatible = (value) => {
  if (Array.isArray(value)) return value.map(cloneJsonCompatible);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneJsonCompatible(item)])
    );
  }
  return value;
};

const filterOutWeightsParam = (param) =>
  Boolean(param) && param?.semanticRole !== "criteriaWeights";

export const SCENARIO_WEIGHTS_SUM_TOLERANCE = 0.001;

const isCriteriaWeightsParameter = (parameter) =>
  parameter?.semanticRole === "criteriaWeights";

export const filterOutWeightsParams = (params) =>
  Array.isArray(params) ? params.filter(filterOutWeightsParam) : [];

const resolveScenarioModelParameters = (model) =>
  filterOutWeightsParams(
    Array.isArray(model?.parameterDefinitions) ? model.parameterDefinitions : []
  );

export const modelUsesScenarioCriteriaWeights = (model) =>
  model?.capabilities?.usesCriteriaWeights === true;

const resolveScenarioWeightRows = (leafCriteria = [], leafCount = 0) => {
  const rowsFromCriteria = (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion, index) => {
      const id = normalizeNonEmptyString(criterion?.id || criterion?._id);
      const name =
        normalizeNonEmptyString(criterion?.name) || `Criterion ${index + 1}`;

      return id ? { id, name } : null;
    })
    .filter(Boolean);

  if (rowsFromCriteria.length > 0) return rowsFromCriteria;

  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;
  return Array.from({ length: safeLeafCount }, (_, index) => ({
    id: `criterion-${index + 1}`,
    name: `Criterion ${index + 1}`,
  }));
};

const isFiniteWeightsByCriterion = ({ weights, rows }) =>
  isPlainObject(weights) &&
  rows.length > 0 &&
  rows.every((row) => Number.isFinite(Number(weights[row.id])));

const buildEqualScenarioWeights = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return {};
  if (rows.length === 1) return { [rows[0].id]: 1 };

  const baseWeight = Number((1 / rows.length).toFixed(6));
  const consumed = baseWeight * (rows.length - 1);
  return rows.reduce((weights, row, index) => {
    weights[row.id] =
      index === rows.length - 1
        ? Number((1 - consumed).toFixed(6))
        : baseWeight;
    return weights;
  }, {});
};

const resolveScenarioWeightDefaults = ({ leafCriteria, leafCount, baseIssueWeights }) => {
  const rows = resolveScenarioWeightRows(leafCriteria, leafCount);
  if (rows.length === 0) return {};

  if (isFiniteWeightsByCriterion({ weights: baseIssueWeights, rows })) {
    return rows.reduce((weights, row) => {
      weights[row.id] = Number(baseIssueWeights[row.id]);
      return weights;
    }, {});
  }

  return buildEqualScenarioWeights(rows);
};

export const validateScenarioCriteriaWeights = ({ weights, leafCriteria = [], leafCount = 0 }) => {
  const rows = resolveScenarioWeightRows(leafCriteria, leafCount);
  if (rows.length === 0) {
    return { ok: false, msg: "Leaf criteria are required to set scenario weights." };
  }
  if (!isPlainObject(weights) || Object.keys(weights).length !== rows.length) {
    return { ok: false, msg: "Provide one weight for each criterion." };
  }

  const normalized = {};
  for (const row of rows) {
    const parsed = Number(weights[row.id]);
    if (!Number.isFinite(parsed)) return { ok: false, msg: "All weights must be numeric." };
    if (parsed < 0 || parsed > 1) {
      return { ok: false, msg: "Each weight must be between 0 and 1." };
    }
    normalized[row.id] = parsed;
  }

  const sum = Object.values(normalized).reduce(
    (accumulator, value) => accumulator + value,
    0
  );
  if (Math.abs(sum - 1) > SCENARIO_WEIGHTS_SUM_TOLERANCE + Number.EPSILON) {
    return { ok: false, msg: "Weights must sum to 1." };
  }

  return { ok: true, normalized };
};

const buildSyntheticWeightsParameter = (model) => {
  if (!modelUsesScenarioCriteriaWeights(model)) return null;

  return {
    key: "weights",
    label: "Criteria weights",
    parameterStructureKey: "numberCriterion",
    semanticRole: "criteriaWeights",
    required: true,
    default: "equal",
    restrictions: {
      min: 0,
      max: 1,
      ordered: null,
      length: "matchCriteria",
      allowed: null,
    },
  };
};

export const getScenarioParameterDefinitions = (model) => {
  const params = resolveScenarioModelParameters(model);
  const syntheticWeights = buildSyntheticWeightsParameter(model);
  return syntheticWeights ? [...params, syntheticWeights] : params;
};

export const buildParamsResolved = ({
  model,
  leafCount,
  leafCriteria = [],
  baseIssueWeights = {},
}) => {
  const out = {};
  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;
  const defaultWeights = resolveScenarioWeightDefaults({
    leafCriteria,
    leafCount: safeLeafCount,
    baseIssueWeights,
  });

  for (const parameter of getScenarioParameterDefinitions(model)) {
    const key = normalizeNonEmptyString(parameter?.key);
    if (!key) continue;

    if (isCriteriaWeightsParameter(parameter)) {
      out[key] = defaultWeights;
      continue;
    }

    if (hasOwnKey(parameter, "default")) {
      out[key] = cloneJsonCompatible(parameter.default);
    }
  }

  return out;
};

export const cleanParamsForSend = ({ model, values, leafCount, leafCriteria = [] }) => {
  const out = {};
  const source = values && typeof values === "object" ? values : {};

  for (const parameter of getScenarioParameterDefinitions(model)) {
    const key = normalizeNonEmptyString(parameter?.key);
    if (!key) continue;

    if (isCriteriaWeightsParameter(parameter)) {
      out[key] = resolveScenarioWeightDefaults({
        leafCriteria,
        leafCount,
        baseIssueWeights: source[key],
      });
      continue;
    }

    if (hasOwnKey(source, key)) {
      out[key] = cloneJsonCompatible(source[key]);
    }
  }

  return out;
};
