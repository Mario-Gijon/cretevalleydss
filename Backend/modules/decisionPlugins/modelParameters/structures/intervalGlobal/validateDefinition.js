import { hasOwnKey, isPlainObject } from "../../../../../utils/common/objects.js";

const isFiniteNumberOrNull = (value) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const satisfiesOrder = ([lower, upper], ordered) =>
  ordered === "strictIncreasing" ? lower < upper : lower <= upper;

export const validateIntervalGlobalDefinition = (parameter) => {
  if (parameter?.scope !== "global") return "scope must be 'global'";

  const restrictions = parameter?.restrictions;
  if (!isPlainObject(restrictions)) return "restrictions must be a plain object";
  if (!hasOwnKey(restrictions, "min") || !hasOwnKey(restrictions, "max") || !hasOwnKey(restrictions, "ordered")) {
    return "restrictions must declare min, max, and ordered";
  }
  const { min, max, ordered } = restrictions;
  if (!isFiniteNumberOrNull(min) || !isFiniteNumberOrNull(max)) {
    return "restrictions min and max must be finite numbers or null";
  }
  if (min !== null && max !== null && min > max) return "restrictions min must not exceed max";
  if (ordered !== "strictIncreasing" && ordered !== "nonDecreasing") {
    return "restrictions ordered must be strictIncreasing or nonDecreasing";
  }
  if (!hasOwnKey(parameter, "default")) return null;

  const defaultValue = parameter.default;
  if (!Array.isArray(defaultValue) || defaultValue.length !== 2) {
    return "default must be an array of exactly 2 finite numbers";
  }
  if (!defaultValue.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return "default must contain finite numbers";
  }
  if (defaultValue.some((value) => (min !== null && value < min) || (max !== null && value > max))) {
    return "default must satisfy the declared range";
  }
  if (!satisfiesOrder(defaultValue, ordered)) {
    return `default must satisfy ordered rule '${ordered}'`;
  }
  return null;
};
