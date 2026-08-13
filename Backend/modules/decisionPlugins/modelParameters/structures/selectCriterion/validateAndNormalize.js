import { hasOwnKey, isPlainObject } from "../../../../../utils/common/objects.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";
import { validateAndNormalizeSelectValue } from "../../selectValueValidation.js";

const VALUE_TYPES = new Set(["string", "number", "integer", "boolean"]);

const normalizeCriterionId = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const buildRows = (context) => {
  const leafCriteria = context?.leafCriteria;
  if (!Array.isArray(leafCriteria) || leafCriteria.length === 0) {
    return { error: "requires at least one leaf criterion" };
  }

  const ids = new Set();
  const rows = [];
  for (const criterion of leafCriteria) {
    const id = normalizeCriterionId(criterion?.id);
    if (!id) return { error: "leaf criteria must include canonical ids" };
    if (ids.has(id)) return { error: `contains duplicate criterion id '${id}'` };
    ids.add(id);
    rows.push({ id, name: normalizeCriterionId(criterion?.name) || id });
  }
  return { rows };
};

const allowedMatchesType = (allowed, valueType) => {
  if (!Array.isArray(allowed) || allowed.length === 0) return false;
  if (new Set(allowed).size !== allowed.length) return false;
  if (valueType === "string") return allowed.every((item) => typeof item === "string" && item.trim() !== "");
  if (valueType === "number") return allowed.every((item) => typeof item === "number" && Number.isFinite(item));
  if (valueType === "integer") return allowed.every((item) => typeof item === "number" && Number.isFinite(item) && Number.isInteger(item));
  return allowed.every((item) => typeof item === "boolean");
};

export const validateAndNormalizeSelectCriterion = ({ value, parameter, context }) => {
  const contextRows = buildRows(context);
  if (contextRows.error) return toInvalid(contextRows.error, value);

  const valueType = parameter?.valueType;
  const allowed = parameter?.restrictions?.allowed;
  if (!VALUE_TYPES.has(valueType) || !allowedMatchesType(allowed, valueType)) {
    return toInvalid("requires a compatible non-empty restrictions.allowed array", value);
  }

  const { rows } = contextRows;
  if (!isPlainObject(value)) {
    const normalized = validateAndNormalizeSelectValue({
      value,
      valueType,
      allowed,
    });
    if (!normalized.ok) return normalized;
    return toValid(Object.fromEntries(rows.map((row) => [row.id, normalized.value])));
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));
  for (const key of Object.keys(value)) {
    if (!normalizeCriterionId(key)) return toInvalid("contains an empty criterion key", key);
    if (!rowById.has(key)) return toInvalid(`contains unknown criterion key '${key}'`, value[key]);
  }

  const normalizedByCriterion = {};
  for (const row of rows) {
    if (!hasOwnKey(value, row.id)) return toInvalid(`is missing value for criterion '${row.id}'`, value);
    const normalized = validateAndNormalizeSelectValue({
      value: value[row.id],
      valueType,
      allowed,
    });
    if (!normalized.ok) return toInvalid(`[${row.name}] ${normalized.message}`, normalized.value);
    normalizedByCriterion[row.id] = normalized.value;
  }
  return toValid(normalizedByCriterion);
};
