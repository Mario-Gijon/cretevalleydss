import { WEIGHT_SUM_TOLERANCE } from "./criteriaWeightDefaults.js";
import { normalizeNumberValue } from "./parameterValues.js";

const toInvalid = (code, details = {}) => ({ ok: false, error: { code, ...details } });
const toValid = (value) => ({ ok: true, value });

export const validateAndNormalizeCrispCriteriaWeightArray = ({
  value,
  expectedLength,
  min = null,
  max = null,
  enforceNonNegative = false,
  requirePositiveTotal = false,
  sumTarget = null,
  sumTolerance = WEIGHT_SUM_TOLERANCE,
}) => {
  if (!Array.isArray(value)) {
    return toInvalid("notArray", { value });
  }

  if (value.length !== expectedLength) {
    return toInvalid("lengthMismatch", {
      value,
      expectedLength,
      receivedLength: value.length,
    });
  }

  const normalized = [];
  for (let index = 0; index < value.length; index += 1) {
    const numericValue = normalizeNumberValue(value[index]);
    if (numericValue === null) {
      return toInvalid("nonFinite", {
        index,
        value: value[index],
      });
    }

    if (
      (typeof min === "number" && numericValue < min) ||
      (typeof max === "number" && numericValue > max)
    ) {
      return toInvalid("outOfRange", {
        index,
        value: value[index],
        min,
        max,
      });
    }

    normalized.push(numericValue);
  }

  if (enforceNonNegative && normalized.some((item) => item < 0)) {
    return toInvalid("nonNegativeViolation", { value });
  }

  const total = normalized.reduce((sum, item) => sum + item, 0);

  if (requirePositiveTotal && total <= 0) {
    return toInvalid("nonPositiveTotal", {
      value,
      total,
    });
  }

  if (
    typeof sumTarget === "number" &&
    Math.abs(total - sumTarget) > sumTolerance
  ) {
    return toInvalid("sumMismatch", {
      value,
      total,
      sumTarget,
      sumTolerance,
    });
  }

  return toValid(normalized);
};

export const validateAndNormalizeFuzzyCriteriaWeightArray = ({
  value,
  expectedLength,
  valueCount = 3,
  min = 0,
  max = 1,
  requireNonDecreasing = true,
  enforceMiddleSum = false,
  middleIndex = 1,
  middleSumTarget = 1,
  sumTolerance = WEIGHT_SUM_TOLERANCE,
}) => {
  if (!Array.isArray(value)) {
    return toInvalid("notArray", { value });
  }

  if (value.length !== expectedLength) {
    return toInvalid("lengthMismatch", {
      value,
      expectedLength,
      receivedLength: value.length,
    });
  }

  const normalized = [];
  for (let index = 0; index < value.length; index += 1) {
    const tuple = value[index];

    if (!Array.isArray(tuple) || tuple.length !== valueCount) {
      return toInvalid("tupleLengthMismatch", {
        index,
        value: tuple,
        expectedValueCount: valueCount,
      });
    }

    const normalizedTuple = tuple.map((item) => normalizeNumberValue(item));
    if (normalizedTuple.some((item) => item === null)) {
      return toInvalid("tupleNonFinite", {
        index,
        value: tuple,
      });
    }

    if (normalizedTuple.some((item) => item < min || item > max)) {
      return toInvalid("tupleOutOfRange", {
        index,
        value: tuple,
        min,
        max,
      });
    }

    if (requireNonDecreasing) {
      for (let tupleIndex = 1; tupleIndex < normalizedTuple.length; tupleIndex += 1) {
        if (normalizedTuple[tupleIndex] < normalizedTuple[tupleIndex - 1]) {
          return toInvalid("tupleNotNonDecreasing", {
            index,
            value: tuple,
          });
        }
      }
    }

    normalized.push(normalizedTuple);
  }

  if (enforceMiddleSum) {
    const middleValues = normalized.map((tuple) => tuple[middleIndex]);
    const middleSum = middleValues.reduce((sum, valueItem) => sum + valueItem, 0);

    if (Math.abs(middleSum - middleSumTarget) > sumTolerance) {
      return toInvalid("middleSumMismatch", {
        value,
        middleIndex,
        middleSum,
        middleSumTarget,
        sumTolerance,
      });
    }
  }

  return toValid(normalized);
};
