import { hasOwnKey, isPlainObject } from "../../../../../utils/common/objects.js";

const isFiniteNumberOrNull = (value) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

export const validateNumberCriterionDefinition = (parameter) => {
  const restrictions = parameter?.restrictions;
  if (!isPlainObject(restrictions)) return "restrictions must be a plain object";
  if (!hasOwnKey(restrictions, "min") || !hasOwnKey(restrictions, "max")) {
    return "restrictions must declare min and max";
  }

  const { min, max } = restrictions;
  if (!isFiniteNumberOrNull(min) || !isFiniteNumberOrNull(max)) {
    return "restrictions min and max must be finite numbers or null";
  }
  if (min !== null && max !== null && min > max) {
    return "restrictions min must not exceed max";
  }
  if (!hasOwnKey(parameter, "default")) return null;
  if (typeof parameter.default !== "number" || !Number.isFinite(parameter.default)) {
    return "default must be a finite number";
  }
  if ((min !== null && parameter.default < min) || (max !== null && parameter.default > max)) {
    return "default must satisfy the declared range";
  }

  return null;
};
