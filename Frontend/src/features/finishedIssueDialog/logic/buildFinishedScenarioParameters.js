const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const stripWeights = (obj) => {
  if (!obj || typeof obj !== "object") return {};
  const { weights, ...rest } = obj;
  void weights;
  return rest;
};

const stripWeightsDeep = (value) => stripWeights(value);

const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

const filterOutWeightsParam = (param) =>
  Boolean(param) &&
  param?.semanticRole !== "criteriaWeights";

export const SCENARIO_WEIGHTS_SUM_TOLERANCE = 0.001;

const isCriteriaWeightsParameter = (parameter) =>
  parameter?.semanticRole === "criteriaWeights" &&
  parameter?.type === "array";

export const filterOutWeightsParams = (params) =>
  Array.isArray(params) ? params.filter(filterOutWeightsParam) : [];

const resolveScenarioModelParameters = (model) =>
  filterOutWeightsParams(Array.isArray(model?.parameters) ? model.parameters : []);

export const modelUsesScenarioCriteriaWeights = (model) =>
  model?.usesCriteriaWeights === true;

export const formatScenarioWeightValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return String(Number(parsed.toFixed(3)));
};

const resolveScenarioWeightRows = (leafCriteria = [], leafCount = 0) => {
  const rowsFromCriteria = (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion, index) => {
      const id = normalizeNonEmptyString(criterion?.id || criterion?._id);
      const name =
        normalizeNonEmptyString(criterion?.name) || `Criterion ${index + 1}`;

      if (!id) {
        return null;
      }

      return { id, name };
    })
    .filter(Boolean);

  if (rowsFromCriteria.length > 0) {
    return rowsFromCriteria;
  }

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
  if (rows.length === 1) {
    return {
      [rows[0].id]: 1,
    };
  }

  const baseWeight = Number((1 / rows.length).toFixed(6));
  const weights = {};
  const consumed = baseWeight * (rows.length - 1);

  rows.forEach((row, index) => {
    weights[row.id] =
      index === rows.length - 1
        ? Number((1 - consumed).toFixed(6))
        : baseWeight;
  });

  return weights;
};

const resolveScenarioWeightDefaults = ({ leafCriteria, leafCount, baseIssueWeights }) => {
  const rows = resolveScenarioWeightRows(leafCriteria, leafCount);

  if (rows.length === 0) {
    return {};
  }

  if (isFiniteWeightsByCriterion({ weights: baseIssueWeights, rows })) {
    return rows.reduce((accumulator, row) => {
      accumulator[row.id] = Number(baseIssueWeights[row.id]);
      return accumulator;
    }, {});
  }

  return buildEqualScenarioWeights(rows);
};

export const validateScenarioCriteriaWeights = ({ weights, leafCriteria = [], leafCount = 0 }) => {
  const rows = resolveScenarioWeightRows(leafCriteria, leafCount);

  if (rows.length === 0) {
    return {
      ok: false,
      msg: "Leaf criteria are required to set scenario weights.",
    };
  }

  if (!isPlainObject(weights)) {
    return {
      ok: false,
      msg: "Provide one weight for each criterion.",
    };
  }

  const weightKeys = Object.keys(weights);
  if (weightKeys.length !== rows.length) {
    return {
      ok: false,
      msg: "Provide one weight for each criterion.",
    };
  }

  const normalized = {};

  for (const row of rows) {
    const parsed = Number(weights[row.id]);

    if (!Number.isFinite(parsed)) {
      return {
        ok: false,
        msg: "All weights must be numeric.",
      };
    }

    if (parsed < 0 || parsed > 1) {
      return {
        ok: false,
        msg: "Each weight must be between 0 and 1.",
      };
    }

    normalized[row.id] = parsed;
  }

  const sum = Object.values(normalized).reduce(
    (accumulator, value) => accumulator + value,
    0
  );
  if (
    Math.abs(sum - 1) >
    SCENARIO_WEIGHTS_SUM_TOLERANCE + Number.EPSILON
  ) {
    return {
      ok: false,
      msg: "Weights must sum to 1.",
    };
  }

  return {
    ok: true,
    normalized,
  };
};

const resolveFuzzyWeightsValueCount = (model) => {
  const valueCount = Number(model?.fuzzyWeightsValueCount);
  return Number.isInteger(valueCount) && valueCount >= 2 ? valueCount : null;
};

const buildSyntheticWeightsParameter = (model) => {
  if (!modelUsesScenarioCriteriaWeights(model)) {
    return null;
  }

  return {
    key: "weights",
    label: "Criteria weights",
    type: "array",
    scope: "perCriterion",
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

const getScenarioParameterDefinitions = (model) => {
  const params = resolveScenarioModelParameters(model);
  const syntheticWeights = buildSyntheticWeightsParameter(model);
  return syntheticWeights ? [...params, syntheticWeights] : params;
};

export const buildPseudoParametersFromValues = (values) => {
  const source = values && typeof values === "object" ? values : {};

  return Object.keys(source)
    .sort()
    .map((key) => {
      const value = source[key];

      const isFuzzyArray =
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(
          (triple) =>
            Array.isArray(triple) &&
            triple.length === 3 &&
            triple.every(
              (item) =>
                item === null || item === undefined || Number.isFinite(Number(item))
            )
        );

      const type = Number.isFinite(Number(value))
        ? "number"
        : isFuzzyArray
          ? "fuzzyArray"
          : Array.isArray(value)
            ? "array"
            : "json";

      return {
        key,
        label: key,
        type,
        default: value,
        rawOnly: true,
      };
    });
};

const clamp = (number, min, max) => {
  if (!Number.isFinite(number)) return number;
  if (min != null && Number.isFinite(min) && number < min) return min;
  if (max != null && Number.isFinite(max) && number > max) return max;
  return number;
};

const ensureArrayLen = (arr, len, filler = "") => {
  const next = Array.isArray(arr) ? [...arr] : [];
  if (next.length < len) return [...next, ...Array(len - next.length).fill(filler)];
  if (next.length > len) return next.slice(0, len);
  return next;
};

const normalizeValueType = (parameter) =>
  String(parameter?.valueType || "").trim().toLowerCase();

const parseByValueType = (rawValue, valueType) => {
  if (rawValue === "" || rawValue === null || rawValue === undefined) return null;

  if (valueType === "number" || valueType === "integer") {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (valueType === "boolean") {
    if (rawValue === true || rawValue === false) return rawValue;
    const normalized = String(rawValue).trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return null;
  }

  return rawValue;
};

const enumValueIsAllowed = ({ value, allowed, valueType }) => {
  if (!Array.isArray(allowed) || allowed.length === 0) return true;

  if (valueType === "number" || valueType === "integer") {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return false;
    return allowed.some((allowedValue) => Number(allowedValue) === numericValue);
  }

  return allowed.some((allowedValue) => allowedValue === value);
};

const parseIntervalPair = (value) => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const left = Number(value[0]);
  const right = Number(value[1]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return [left, right];
};

const validateIntervalByRestrictions = ({ pair, restrictions }) => {
  if (!Array.isArray(pair) || pair.length !== 2) return false;
  const [left, right] = pair;
  const min = restrictions?.min;
  const max = restrictions?.max;

  if (min != null && (left < Number(min) || right < Number(min))) return false;
  if (max != null && (left > Number(max) || right > Number(max))) return false;

  const ordered = restrictions?.ordered;
  if (ordered === "strictIncreasing" && !(left < right)) return false;
  if (ordered === "nonDecreasing" && !(left <= right)) return false;

  return true;
};

const resolveCriterionMapLeafRows = (leafCriteria = []) => {
  if (!Array.isArray(leafCriteria)) {
    return [];
  }

  return leafCriteria
    .map((criterion, index) => {
      const key = normalizeNonEmptyString(
        criterion?.id || criterion?._id
      );
      const name =
        normalizeNonEmptyString(criterion?.name) || `Criterion ${index + 1}`;

      if (!key) {
        return null;
      }

      return { key, name };
    })
    .filter(Boolean);
};

const parseCriterionMapValueByRestrictions = ({ rawValue, restrictions }) => {
  const valueType = normalizeNonEmptyString(restrictions?.valueType) || "number";

  if (valueType === "number") {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    if (
      typeof restrictions?.min === "number" &&
      parsed < Number(restrictions.min)
    ) {
      return null;
    }

    if (
      typeof restrictions?.max === "number" &&
      parsed > Number(restrictions.max)
    ) {
      return null;
    }

    return parsed;
  }

  if (valueType === "enum") {
    const allowed = Array.isArray(restrictions?.allowed)
      ? restrictions.allowed
      : [];
    if (!allowed.length) {
      return null;
    }

    const allNumbers = allowed.every(
      (item) => typeof item === "number" && Number.isFinite(item)
    );
    if (allNumbers) {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed)) {
        return null;
      }
      return allowed.includes(parsed) ? parsed : null;
    }

    const allStrings = allowed.every((item) => typeof item === "string");
    if (allStrings) {
      if (typeof rawValue !== "string") {
        return null;
      }
      const normalized = rawValue.trim();
      return allowed.includes(normalized) ? normalized : null;
    }

    return allowed.some((item) => Object.is(item, rawValue)) ? rawValue : null;
  }

  return null;
};

const buildCriterionMapFromDefaults = ({ param, leafCriteria }) => {
  const rows = resolveCriterionMapLeafRows(leafCriteria);
  const restrictions = isPlainObject(param?.restrictions)
    ? param.restrictions
    : {};
  const requiredForEachCriterion = restrictions.requiredForEachCriterion === true;

  const out = {};

  for (const row of rows) {
    let seed = null;
    if (isPlainObject(param?.default) && Object.prototype.hasOwnProperty.call(param.default, row.key)) {
      seed = param.default[row.key];
    } else if (!isPlainObject(param?.default)) {
      seed = param.default;
    }

    if (!requiredForEachCriterion && (seed === null || seed === undefined || seed === "")) {
      continue;
    }

    const normalized = parseCriterionMapValueByRestrictions({
      rawValue: seed,
      restrictions,
    });

    if (normalized !== null) {
      out[row.key] = normalized;
      continue;
    }

    if (requiredForEachCriterion) {
      out[row.key] = seed ?? "";
    }
  }

  return out;
};

export const buildParamsResolved = ({ model, leafCount, leafCriteria = [] }) => {
  const out = isPlainObject(model?.defaultsResolved)
    ? stripWeightsDeep(model.defaultsResolved)
    : {};
  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;
  const defaultWeights = resolveScenarioWeightDefaults({
    leafCriteria,
    leafCount: safeLeafCount,
    baseIssueWeights: model?.baseIssueWeights,
  });

  for (const param of getScenarioParameterDefinitions(model)) {
    const key = param?.key;
    if (!key) continue;

    if (param.type === "number") out[key] = param.default ?? "";

    if (param.type === "enum") out[key] = param.default ?? "";

    if (param.type === "interval") {
      const min = param?.restrictions?.min ?? "";
      const max = param?.restrictions?.max ?? "";
      out[key] = ensureArrayLen(Array.isArray(param.default) ? param.default : [min, max], 2, "");
    }

    if (param.type === "array") {
      const len =
        getParameterExpectedLength(param, leafCount) ??
        param?.restrictions?.length ??
        2;
      const base = Array.isArray(param.default) ? param.default : [];
      const count = Number(len) || 2;
      const isWeightsByCriteria = isCriteriaWeightsParameter(param);

      if (isWeightsByCriteria && safeLeafCount === 1) {
        out[key] = defaultWeights;
        continue;
      }

      if (isWeightsByCriteria && param?.default === "equal" && count > 0) {
        out[key] = defaultWeights;
        continue;
      }

      out[key] = ensureArrayLen(base, count, "");
    }

    if (param.type === "fuzzyArray") {
      const isFuzzyWeightsByCriteria =
        param?.semanticRole === "criteriaWeights" &&
        param?.type === "fuzzyArray";
      const fuzzyValueCount =
        Number(param?.restrictions?.length) || resolveFuzzyWeightsValueCount(model);
      if (
        isFuzzyWeightsByCriteria &&
        safeLeafCount === 1 &&
        Number.isInteger(fuzzyValueCount) &&
        fuzzyValueCount >= 2
      ) {
        out[key] = [Array.from({ length: fuzzyValueCount }, () => 1)];
        continue;
      }

      const len = getParameterExpectedLength(param, leafCount) ?? param?.restrictions?.length ?? 1;
      const count = Number(len) || 1;
      const vectorLength =
        Number.isInteger(Number(param?.restrictions?.length)) &&
        Number(param.restrictions.length) >= 2
          ? Number(param.restrictions.length)
          : 3;
      const base = Array.isArray(param.default) ? param.default : [];
      const fillerVector = Array.from({ length: vectorLength }, () => "");
      const filled = ensureArrayLen(base, count, fillerVector).map((vector) =>
        Array.isArray(vector) && vector.length === vectorLength
          ? vector
          : [...fillerVector]
      );
      out[key] = filled;
    }

    if (param.type === "criterionMap") {
      out[key] = buildCriterionMapFromDefaults({ param, leafCriteria });
    }
  }

  return out;
};

export const cleanParamsForSend = ({
  model,
  values,
  leafCount,
  leafCriteria = [],
}) => {
  const out = {};

  for (const param of getScenarioParameterDefinitions(model)) {
    const name = param?.key;
    if (!name) continue;
    const type = param.type;
    const restrictions = param.restrictions || {};
    const def = param.default;

    if (type === "number") {
      const raw = values?.[name];
      const value = raw === "" || raw == null ? def : raw;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) continue;

      if (Array.isArray(restrictions.allowed) && restrictions.allowed.length) {
        if (!restrictions.allowed.includes(parsed)) continue;
        out[name] = parsed;
        continue;
      }

      out[name] = clamp(parsed, restrictions.min ?? null, restrictions.max ?? null);
      continue;
    }

    if (type === "array") {
      const isWeightsByCriteria = isCriteriaWeightsParameter(param);
      const len =
        getParameterExpectedLength(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(def) ? def.length : 2);
      const count = Number(len) || 2;

      if (isWeightsByCriteria && Number(leafCount) === 1) {
        out[name] = resolveScenarioWeightDefaults({
          leafCriteria,
          leafCount,
          baseIssueWeights: values?.[name] ?? model?.baseIssueWeights,
        });
        continue;
      }

      if (isWeightsByCriteria) {
        out[name] = resolveScenarioWeightDefaults({
          leafCriteria,
          leafCount,
          baseIssueWeights: values?.[name] ?? model?.baseIssueWeights,
        });
        continue;
      }

      const fallbackDefault = def;

      const arr = ensureArrayLen(
        values?.[name] ?? fallbackDefault ?? [],
        count,
        ""
      );
      const parsed = arr.map((item) => (item === "" || item == null ? null : Number(item)));
      if (parsed.some((item) => item == null || !Number.isFinite(item))) continue;

      out[name] = parsed.map((item) =>
        clamp(item, restrictions.min ?? null, restrictions.max ?? null)
      );
      continue;
    }

    if (type === "enum") {
      const valueType = normalizeValueType(param);
      const raw = values?.[name];
      const value = raw === "" || raw == null ? def : raw;
      const parsed = parseByValueType(value, valueType);
      if (parsed == null) continue;

      if (!enumValueIsAllowed({ value: parsed, allowed: restrictions.allowed, valueType })) {
        continue;
      }

      out[name] = parsed;
      continue;
    }

    if (type === "interval") {
      const fallback = Array.isArray(def)
        ? def
        : [restrictions.min ?? "", restrictions.max ?? ""];
      const source = values?.[name] ?? fallback;
      const parsed = parseIntervalPair(ensureArrayLen(source, 2, ""));
      if (!parsed) continue;
      if (!validateIntervalByRestrictions({ pair: parsed, restrictions })) continue;
      out[name] = parsed;
      continue;
    }

    if (type === "fuzzyArray") {
      const isFuzzyWeightsByCriteria =
        param?.semanticRole === "criteriaWeights" &&
        param?.type === "fuzzyArray";
      const fuzzyValueCount =
        Number(restrictions.length) || resolveFuzzyWeightsValueCount(model);
      if (
        isFuzzyWeightsByCriteria &&
        Number(leafCount) === 1 &&
        Number.isInteger(fuzzyValueCount) &&
        fuzzyValueCount >= 2
      ) {
        out[name] = [Array.from({ length: fuzzyValueCount }, () => 1)];
        continue;
      }

      const len =
        getParameterExpectedLength(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(def) ? def.length : 1);
      const vectorLength =
        Number.isInteger(Number(restrictions.length)) &&
        Number(restrictions.length) >= 2
          ? Number(restrictions.length)
          : 3;
      const fillerVector = Array.from({ length: vectorLength }, () => "");

      const triples = ensureArrayLen(
        values?.[name] ?? def ?? [],
        Number(len) || 1,
        fillerVector
      );

      const parsed = triples.map((vector) => {
        const safeVector =
          Array.isArray(vector) && vector.length === vectorLength
            ? vector
            : fillerVector;
        return safeVector.map((item) => (item === "" || item == null ? null : Number(item)));
      });

      if (parsed.some((vector) => vector.some((item) => item == null || !Number.isFinite(item)))) {
        continue;
      }

      out[name] = parsed.map((vector) =>
        vector.map((item) =>
          clamp(item, restrictions.min ?? null, restrictions.max ?? null)
        )
      );
      continue;
    }

    if (type === "criterionMap") {
      const rows = resolveCriterionMapLeafRows(leafCriteria);
      const requiredForEachCriterion = restrictions.requiredForEachCriterion === true;
      const source = isPlainObject(values?.[name]) ? values[name] : {};
      const next = {};

      for (const row of rows) {
        const hasValue = Object.prototype.hasOwnProperty.call(source, row.key);
        if (!hasValue) {
          if (!requiredForEachCriterion) {
            continue;
          }
          next[row.key] = "";
          continue;
        }

        const normalized = parseCriterionMapValueByRestrictions({
          rawValue: source[row.key],
          restrictions,
        });

        if (normalized === null) {
          continue;
        }

        next[row.key] = normalized;
      }

      out[name] = next;
      continue;
    }
  }

  return out;
};

export const validateParams = ({
  model,
  values,
  leafCount,
  leafCriteria = [],
}) => {
  for (const param of getScenarioParameterDefinitions(model)) {
    const name = param?.key;
    if (!name) continue;
    const type = param.type;
    const restrictions = param.restrictions || {};
    const value = values?.[name];

    if (type === "number") {
      if (value === "" || value == null) continue;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return { ok: false, msg: `Parameter '${name}' must be a number.` };
      }
      if (
        Array.isArray(restrictions.allowed) &&
        restrictions.allowed.length &&
        !restrictions.allowed.includes(parsed)
      ) {
        return {
          ok: false,
          msg: `Parameter '${name}' must be one of: ${restrictions.allowed.join(", ")}.`,
        };
      }
      if (restrictions.min != null && parsed < restrictions.min) {
        return { ok: false, msg: `Parameter '${name}' must be ≥ ${restrictions.min}.` };
      }
      if (restrictions.max != null && parsed > restrictions.max) {
        return { ok: false, msg: `Parameter '${name}' must be ≤ ${restrictions.max}.` };
      }
      continue;
    }

    if (type === "enum") {
      const valueType = normalizeValueType(param);
      const raw = value === "" || value == null ? param.default : value;
      const parsed = parseByValueType(raw, valueType);

      if ((value === "" || value == null) && param?.required && parsed == null) {
        return { ok: false, msg: `Parameter '${name}' is required.` };
      }

      if (parsed == null) continue;

      if (!enumValueIsAllowed({ value: parsed, allowed: restrictions.allowed, valueType })) {
        return {
          ok: false,
          msg: `Parameter '${name}' must be one of: ${(restrictions.allowed || []).join(", ")}.`,
        };
      }
      continue;
    }

    if (type === "interval") {
      const fallback = Array.isArray(param.default)
        ? param.default
        : [restrictions.min ?? "", restrictions.max ?? ""];
      const source = value == null ? fallback : value;
      const parsed = parseIntervalPair(ensureArrayLen(source, 2, ""));

      if (!parsed) {
        return {
          ok: false,
          msg: `Parameter '${name}' must be an array of 2 finite numbers.`,
        };
      }

      if (!validateIntervalByRestrictions({ pair: parsed, restrictions })) {
        if (restrictions.ordered === "strictIncreasing") {
          return { ok: false, msg: `Parameter '${name}' must satisfy left < right.` };
        }
        if (restrictions.ordered === "nonDecreasing") {
          return { ok: false, msg: `Parameter '${name}' must satisfy left ≤ right.` };
        }
        if (restrictions.min != null) {
          return { ok: false, msg: `Parameter '${name}' must be ≥ ${restrictions.min}.` };
        }
        if (restrictions.max != null) {
          return { ok: false, msg: `Parameter '${name}' must be ≤ ${restrictions.max}.` };
        }
      }
      continue;
    }

    if (type === "array") {
      const isWeightsByCriteria = isCriteriaWeightsParameter(param);
      const len =
        getParameterExpectedLength(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(param.default) ? param.default.length : 2);
      const count = Number(len) || 2;

      if (isWeightsByCriteria && Number(leafCount) === 1) {
        continue;
      }

      if (isWeightsByCriteria) {
        const validation = validateScenarioCriteriaWeights({
          weights: value,
          leafCriteria,
          leafCount,
        });
        if (!validation.ok) {
          return validation;
        }
        continue;
      }

      const arr = ensureArrayLen(
        Array.isArray(value)
          ? value
          : Array.isArray(param.default)
            ? param.default
            : [],
        count,
        ""
      );

      if (arr.some((item) => item === "" || item == null || !Number.isFinite(Number(item)))) {
        return {
          ok: false,
          msg: `Parameter '${name}' must be a complete array of ${len} numbers.`,
        };
      }

      const numbers = arr.map((item) => Number(item));
      const sum = numbers.reduce((acc, item) => acc + item, 0);

      if (restrictions.normalize === true) {
        if (sum <= 0) {
          return { ok: false, msg: `Parameter '${name}' must contain at least one value greater than 0.` };
        }
      } else if (restrictions.sum != null) {
        const epsilon = 1e-6;
        if (Math.abs(sum - restrictions.sum) > epsilon) {
          return { ok: false, msg: `Parameter '${name}' sum must be ${restrictions.sum}.` };
        }
      }

      if (
        Number(len) === 2 &&
        !restrictions.sum &&
        getParameterExpectedLength(param, leafCount) == null
      ) {
        if (numbers[0] >= numbers[1]) {
          return { ok: false, msg: `Parameter '${name}' must satisfy left < right.` };
        }
      }

      continue;
    }

    if (type === "fuzzyArray") {
      const isFuzzyWeightsByCriteria =
        param?.semanticRole === "criteriaWeights" &&
        param?.type === "fuzzyArray";
      const fuzzyValueCount =
        Number(restrictions.length) || resolveFuzzyWeightsValueCount(model);
      if (
        isFuzzyWeightsByCriteria &&
        Number(leafCount) === 1 &&
        Number.isInteger(fuzzyValueCount) &&
        fuzzyValueCount >= 2
      ) {
        continue;
      }

      const len =
        getParameterExpectedLength(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(param.default) ? param.default.length : 1);
      const vectorLength =
        Number.isInteger(Number(restrictions.length)) &&
        Number(restrictions.length) >= 2
          ? Number(restrictions.length)
          : 3;
      const fillerVector = Array.from({ length: vectorLength }, () => "");

      const triples = ensureArrayLen(
        Array.isArray(value)
          ? value
          : Array.isArray(param.default)
            ? param.default
            : [],
        Number(len) || 1,
        fillerVector
      );

      for (let index = 0; index < triples.length; index += 1) {
        const triple = triples[index];

        if (!Array.isArray(triple) || triple.length !== vectorLength) {
          return {
            ok: false,
            msg: `Parameter '${name}' must be an array of vectors with length ${vectorLength}.`,
          };
        }

        const numbers = triple.map((item) => Number(item));
        if (numbers.some((item) => !Number.isFinite(item))) {
          return {
            ok: false,
            msg: `Parameter '${name}' has invalid fuzzy values.`,
          };
        }

        for (let vectorIndex = 1; vectorIndex < numbers.length; vectorIndex += 1) {
          if (numbers[vectorIndex] < numbers[vectorIndex - 1]) {
            return {
              ok: false,
              msg: `Parameter '${name}' requires non-decreasing fuzzy vectors.`,
            };
          }
        }

        if (
          restrictions.min != null &&
          numbers.some((item) => item < Number(restrictions.min))
        ) {
          return {
            ok: false,
            msg: `Parameter '${name}' must be ≥ ${restrictions.min}.`,
          };
        }

        if (
          restrictions.max != null &&
          numbers.some((item) => item > Number(restrictions.max))
        ) {
          return {
            ok: false,
            msg: `Parameter '${name}' must be ≤ ${restrictions.max}.`,
          };
        }
      }
    }

    if (type === "criterionMap") {
      const rows = resolveCriterionMapLeafRows(leafCriteria);
      const source = values?.[name];
      const requiredForEachCriterion = restrictions.requiredForEachCriterion === true;

      if (!isPlainObject(source)) {
        if (requiredForEachCriterion) {
          return {
            ok: false,
            msg: `Parameter '${name}' must be an object keyed by criterion.`,
          };
        }
        continue;
      }

      const allowedKeys = new Set(rows.map((row) => row.key));
      const unknown = Object.keys(source).find((key) => !allowedKeys.has(key));
      if (unknown) {
        return {
          ok: false,
          msg: `Parameter '${name}' contains unknown criterion key '${unknown}'.`,
        };
      }

      if (requiredForEachCriterion) {
        const missing = rows.find(
          (row) => !Object.prototype.hasOwnProperty.call(source, row.key)
        );
        if (missing) {
          return {
            ok: false,
            msg: `Parameter '${name}' is missing '${missing.name}'.`,
          };
        }
      }

      for (const row of rows) {
        if (!Object.prototype.hasOwnProperty.call(source, row.key)) {
          continue;
        }

        const normalized = parseCriterionMapValueByRestrictions({
          rawValue: source[row.key],
          restrictions,
        });

        if (normalized === null) {
          return {
            ok: false,
            msg: `Parameter '${name}' has invalid value for '${row.name}'.`,
          };
        }
      }
    }
  }

  return { ok: true };
};
