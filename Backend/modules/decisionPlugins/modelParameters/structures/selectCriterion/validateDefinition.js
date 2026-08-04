import { hasOwnKey, isPlainObject } from "../../../../../utils/common/objects.js";

const VALUE_TYPES = new Set(["string", "number", "integer", "boolean"]);

const valueMatchesType = (value, valueType) => {
  if (valueType === "string") return typeof value === "string" && value.trim() !== "";
  if (valueType === "number") return typeof value === "number" && Number.isFinite(value);
  if (valueType === "integer") return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
  return typeof value === "boolean";
};

export const validateSelectCriterionDefinition = (parameter) => {
  if (parameter === null || typeof parameter !== "object" || Array.isArray(parameter)) {
    return "parameter must be an object";
  }

  const { valueType, restrictions } = parameter;
  if (!VALUE_TYPES.has(valueType)) {
    return "valueType must be string, number, integer, or boolean";
  }
  if (!isPlainObject(restrictions) || !hasOwnKey(restrictions, "allowed")) {
    return "restrictions must declare allowed";
  }

  const { allowed } = restrictions;
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return "restrictions allowed must be a non-empty array";
  }
  if (!allowed.every((value) => valueMatchesType(value, valueType))) {
    return `restrictions allowed must contain ${valueType} values`;
  }
  if (new Set(allowed).size !== allowed.length) {
    return "restrictions allowed must not contain duplicates";
  }
  if (!hasOwnKey(parameter, "default")) return null;
  if (!valueMatchesType(parameter.default, valueType)) {
    return `default must be a ${valueType} value`;
  }
  if (!allowed.includes(parameter.default)) {
    return "default must be one of the allowed values";
  }

  return null;
};
