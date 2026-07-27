import { hasOwnKey, isPlainObject } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../parameterValues.js";

const VALUE_TYPES = new Set(["number", "integer"]);
const RESTRICTION_FIELDS = new Set(["min", "max", "allowed"]);
const FORBIDDEN_PARAMETER_FIELDS = Object.freeze([
  "isInteger",
  "numericType",
  "type",
  "minimum",
  "maximum",
  "options",
]);
const FORBIDDEN_RESTRICTION_FIELDS = Object.freeze([
  "minimum",
  "maximum",
  "options",
  "valueType",
]);

const isFiniteNumber = (value) =>
  typeof value === "number" &&
  !Number.isNaN(value) &&
  Number.isFinite(value);

const validateRestrictionNumber = ({ value, field, valueType }) => {
  if (value === null) {
    return null;
  }

  if (!isFiniteNumber(value)) {
    return `${field} must be a finite number or null`;
  }

  if (valueType === "integer" && !Number.isInteger(value)) {
    return `${field} must be an integer for integer parameters`;
  }

  return null;
};

const numberSatisfiesRestrictions = ({ value, restrictions }) => {
  if (restrictions.min !== null && value < restrictions.min) {
    return false;
  }
  if (restrictions.max !== null && value > restrictions.max) {
    return false;
  }
  if (
    Array.isArray(restrictions.allowed) &&
    restrictions.allowed.length > 0 &&
    !restrictions.allowed.includes(value)
  ) {
    return false;
  }

  return true;
};

export const validateNumberGlobalMetadata = (parameter) => {
  if (
    parameter === null ||
    typeof parameter !== "object" ||
    Array.isArray(parameter)
  ) {
    return "metadata must be an object";
  }

  if (!normalizeNonEmptyString(parameter.key)) {
    return "metadata key must be a non-empty string";
  }
  if (!normalizeNonEmptyString(parameter.label)) {
    return "metadata label must be a non-empty string";
  }
  if (parameter.scope !== "global") {
    return "metadata scope must be 'global'";
  }
  if (parameter.parameterStructureKey !== "numberGlobal") {
    return "metadata parameterStructureKey must be 'numberGlobal'";
  }
  if (!VALUE_TYPES.has(parameter.valueType)) {
    return "metadata valueType must be 'number' or 'integer'";
  }
  if (typeof parameter.required !== "boolean") {
    return "metadata required must be a boolean";
  }

  const forbiddenParameterField = FORBIDDEN_PARAMETER_FIELDS.find((field) =>
    hasOwnKey(parameter, field)
  );
  if (forbiddenParameterField) {
    return `metadata field '${forbiddenParameterField}' is not supported`;
  }

  const restrictions = parameter.restrictions;
  if (!isPlainObject(restrictions)) {
    return "metadata restrictions must be a plain object";
  }
  if (
    !hasOwnKey(restrictions, "min") ||
    !hasOwnKey(restrictions, "max") ||
    !hasOwnKey(restrictions, "allowed")
  ) {
    return "metadata restrictions must declare min, max, and allowed";
  }

  const forbiddenRestrictionField = FORBIDDEN_RESTRICTION_FIELDS.find((field) =>
    hasOwnKey(restrictions, field)
  );
  if (forbiddenRestrictionField) {
    return `metadata restrictions field '${forbiddenRestrictionField}' is not supported`;
  }
  const unsupportedRestrictionField = Object.keys(restrictions).find(
    (field) => !RESTRICTION_FIELDS.has(field)
  );
  if (unsupportedRestrictionField) {
    return `metadata restrictions field '${unsupportedRestrictionField}' is not supported`;
  }

  const minError = validateRestrictionNumber({
    value: restrictions.min,
    field: "metadata restrictions.min",
    valueType: parameter.valueType,
  });
  if (minError) return minError;

  const maxError = validateRestrictionNumber({
    value: restrictions.max,
    field: "metadata restrictions.max",
    valueType: parameter.valueType,
  });
  if (maxError) return maxError;

  if (
    restrictions.min !== null &&
    restrictions.max !== null &&
    restrictions.min > restrictions.max
  ) {
    return "metadata restrictions.min must be less than or equal to restrictions.max";
  }

  if (restrictions.allowed !== null && !Array.isArray(restrictions.allowed)) {
    return "metadata restrictions.allowed must be an array or null";
  }

  if (Array.isArray(restrictions.allowed)) {
    const seen = new Set();
    for (const allowedValue of restrictions.allowed) {
      if (!isFiniteNumber(allowedValue)) {
        return "metadata restrictions.allowed must contain only finite numbers";
      }
      if (
        parameter.valueType === "integer" &&
        !Number.isInteger(allowedValue)
      ) {
        return "metadata restrictions.allowed must contain only integers for integer parameters";
      }
      if (!numberSatisfiesRestrictions({ value: allowedValue, restrictions })) {
        return "metadata restrictions.allowed values must satisfy the declared range";
      }
      if (seen.has(allowedValue)) {
        return "metadata restrictions.allowed must not contain duplicate values";
      }
      seen.add(allowedValue);
    }
  }

  if (parameter.default === undefined) {
    return parameter.required
      ? "metadata required parameters must declare a default"
      : null;
  }

  if (!isFiniteNumber(parameter.default)) {
    return "metadata default must be a finite number";
  }
  if (
    parameter.valueType === "integer" &&
    !Number.isInteger(parameter.default)
  ) {
    return "metadata default must be an integer for integer parameters";
  }
  if (
    !numberSatisfiesRestrictions({
      value: parameter.default,
      restrictions,
    })
  ) {
    return "metadata default must satisfy the declared restrictions";
  }

  return null;
};
