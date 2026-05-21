import { resolveLeafCriteriaRows } from "./criterionMap.validation";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeRestrictions = (parameter) => {
  return isPlainObject(parameter?.restrictions) ? parameter.restrictions : {};
};

const resolveDefaultEntryValue = ({ parameter, restrictions, criterionKey }) => {
  const defaultValue = parameter?.default;

  if (isPlainObject(defaultValue) && Object.prototype.hasOwnProperty.call(defaultValue, criterionKey)) {
    return defaultValue[criterionKey];
  }

  if (!isPlainObject(defaultValue) && defaultValue !== null && defaultValue !== undefined) {
    return defaultValue;
  }

  if ((restrictions?.valueType || "number") === "enum") {
    const allowed = Array.isArray(restrictions?.allowed) ? restrictions.allowed : [];
    return allowed.length > 0 ? allowed[0] : "";
  }

  return "";
};

const buildCriterionMapFromLeafCriteria = ({ parameter, leafCriteria }) => {
  const rows = resolveLeafCriteriaRows(leafCriteria);
  const restrictions = normalizeRestrictions(parameter);
  const requiredForEachCriterion = restrictions.requiredForEachCriterion === true;

  if (rows.length === 0) {
    return {};
  }

  const entries = rows
    .map((row) => {
      const entry = resolveDefaultEntryValue({
        parameter,
        restrictions,
        criterionKey: row.key,
      });

      if (!requiredForEachCriterion && (entry === null || entry === undefined || entry === "")) {
        return null;
      }

      return [row.key, entry];
    })
    .filter(Boolean);

  return Object.fromEntries(entries);
};

export const buildCriterionMapDefault = ({ parameter, leafCriteria }) => {
  if (isPlainObject(parameter?.default)) {
    return { ...parameter.default };
  }

  return buildCriterionMapFromLeafCriteria({ parameter, leafCriteria });
};

export const syncCriterionMapValue = ({ previousValue, parameter, leafCriteria }) => {
  const rows = resolveLeafCriteriaRows(leafCriteria);
  const allowedKeys = new Set(rows.map((row) => row.key));

  const current = isPlainObject(previousValue) ? previousValue : {};
  const filtered = Object.fromEntries(
    Object.entries(current).filter(([key]) => allowedKeys.has(key))
  );

  const restrictions = normalizeRestrictions(parameter);
  if (restrictions.requiredForEachCriterion !== true) {
    return filtered;
  }

  const defaults = buildCriterionMapFromLeafCriteria({ parameter, leafCriteria });

  for (const row of rows) {
    if (!Object.prototype.hasOwnProperty.call(filtered, row.key)) {
      filtered[row.key] = defaults[row.key] ?? "";
    }
  }

  return filtered;
};
