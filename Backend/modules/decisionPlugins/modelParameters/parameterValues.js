import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

export { normalizeNonEmptyString };

export const resolveParameterKey = (parameter) =>
  normalizeNonEmptyString(parameter?.key);

export const getValueType = (value) => {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
};

const valuesAreEqual = (left, right) => {
  if (typeof left === "number" && typeof right === "number") {
    return Object.is(left, right);
  }

  return JSON.stringify(left) === JSON.stringify(right);
};

export const isAllowedValue = (value, allowed) => {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) =>
      allowed.some((allowedItem) => valuesAreEqual(item, allowedItem))
    );
  }

  return allowed.some((allowedItem) => valuesAreEqual(value, allowedItem));
};

export const normalizeNumberValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

export const isMissingParameterValue = (value) =>
  value === undefined || value === null || value === "";
