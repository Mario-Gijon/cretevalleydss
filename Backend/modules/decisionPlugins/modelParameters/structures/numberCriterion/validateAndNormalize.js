import { normalizeNumberValue } from "../../../../modelParameters/parameterValues.js";
import { hasOwnKey, isPlainObject } from "../../../../../utils/common/objects.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";

const normalizeCriterionId = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const buildLeafCriterionRows = (leafCriteria) => {
  if (!Array.isArray(leafCriteria) || leafCriteria.length === 0) {
    return { error: "requires at least one leaf criterion" };
  }

  const seenIds = new Set();
  const rows = [];
  for (const criterion of leafCriteria) {
    const id = normalizeCriterionId(criterion?.id);
    if (!id) return { error: "leaf criteria must include canonical ids" };
    if (seenIds.has(id)) return { error: `contains duplicate criterion id '${id}'` };
    seenIds.add(id);
    const name = normalizeCriterionId(criterion?.name) || id;
    rows.push({ id, name });
  }

  return { rows };
};

const isWithinRange = ({ value, restrictions }) => {
  const { min = null, max = null } = restrictions || {};
  return (min === null || value >= min) && (max === null || value <= max);
};

const normalizeCriterionValue = ({ value, restrictions, criterionName }) => {
  const normalized = normalizeNumberValue(value);
  if (normalized === null) return toInvalid("must be a finite number", value);
  if (!isWithinRange({ value: normalized, restrictions })) {
    return toInvalid(
      `[${criterionName}] must be between ${restrictions?.min ?? "-∞"} and ${restrictions?.max ?? "+∞"}`,
      value
    );
  }
  return toValid(normalized);
};

export const validateAndNormalizeNumberCriterion = ({ value, parameter, context }) => {
  const contextRows = buildLeafCriterionRows(context?.leafCriteria);
  if (contextRows.error) return toInvalid(contextRows.error, value);

  const { rows } = contextRows;
  const restrictions = parameter?.restrictions || {};
  if (!isPlainObject(value)) {
    const normalized = normalizeCriterionValue({
      value,
      restrictions,
      criterionName: rows[0].name,
    });
    if (!normalized.ok) return normalized;
    return toValid(
      rows.reduce((result, row) => {
        result[row.id] = normalized.value;
        return result;
      }, {})
    );
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const inputKeys = Object.keys(value);
  for (const inputKey of inputKeys) {
    if (!normalizeCriterionId(inputKey)) return toInvalid("contains an empty criterion key", inputKey);
    if (!rowById.has(inputKey)) {
      return toInvalid(`contains unknown criterion key '${inputKey}'`, value[inputKey]);
    }
  }

  const normalizedByCriterion = {};
  for (const row of rows) {
    if (!hasOwnKey(value, row.id)) {
      return toInvalid(`is missing value for criterion '${row.id}'`, value);
    }
    const normalized = normalizeCriterionValue({
      value: value[row.id],
      restrictions,
      criterionName: row.name,
    });
    if (!normalized.ok) return normalized;
    normalizedByCriterion[row.id] = normalized.value;
  }

  return toValid(normalizedByCriterion);
};
