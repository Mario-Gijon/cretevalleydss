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

export const isWithinRange = (value, restrictions = {}) => {
  if (typeof restrictions.min === "number" && value < restrictions.min) {
    return false;
  }

  if (typeof restrictions.max === "number" && value > restrictions.max) {
    return false;
  }

  return true;
};

export const validateOrderedRule = (values, orderedRule) => {
  if (!orderedRule || values.length < 2) {
    return true;
  }

  if (orderedRule === "strictIncreasing") {
    for (let index = 1; index < values.length; index += 1) {
      if (!(values[index - 1] < values[index])) {
        return false;
      }
    }
    return true;
  }

  if (orderedRule === "nonDecreasing") {
    for (let index = 1; index < values.length; index += 1) {
      if (!(values[index - 1] <= values[index])) {
        return false;
      }
    }
    return true;
  }

  return false;
};
