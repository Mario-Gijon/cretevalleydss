import {
  isAllowedValue,
  normalizeNonEmptyString,
  normalizeNumberValue,
} from "../parameterValues.js";
import {
  isWithinRange,
  resolveExpectedArrayLength,
  validateOrderedRule,
} from "../parameterRestrictions.js";
import {
  toInvalid,
  toValid,
} from "../parameterValidationResult.js";

export const validateAndNormalizeArrayParameter = ({ value, parameter, context }) => {
  const restrictions = parameter?.restrictions || {};

  if (!Array.isArray(value)) {
    return toInvalid("must be an array", value);
  }

  const expectedLength = resolveExpectedArrayLength({
    parameter,
    leafCriteria: context.leafCriteria,
  });

  if (expectedLength !== null && value.length !== expectedLength) {
    return toInvalid(`must contain exactly ${expectedLength} values`, value);
  }

  const itemType = normalizeNonEmptyString(restrictions.itemType) || "number";
  const normalizedArray = [];

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];

    if (itemType === "number" || itemType === "integer") {
      const normalizedNumber = normalizeNumberValue(item);
      if (
        normalizedNumber === null ||
        (itemType === "integer" && !Number.isInteger(normalizedNumber))
      ) {
        return toInvalid(`[${index}] must be a ${itemType}`, item);
      }
      if (!isWithinRange(normalizedNumber, restrictions)) {
        return toInvalid(
          `[${index}] must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
          item
        );
      }
      normalizedArray.push(normalizedNumber);
      continue;
    }

    if (itemType === "boolean") {
      if (typeof item !== "boolean") {
        return toInvalid(`[${index}] must be a boolean`, item);
      }
      normalizedArray.push(item);
      continue;
    }

    if (itemType === "string") {
      if (typeof item !== "string") {
        return toInvalid(`[${index}] must be a string`, item);
      }
      normalizedArray.push(item.trim());
      continue;
    }

    return toInvalid(`uses unsupported itemType '${itemType}'`, item);
  }

  if (
    typeof restrictions.sum === "number" &&
    Math.abs(normalizedArray.reduce((sum, item) => sum + item, 0) - restrictions.sum) >
      1e-6
  ) {
    return toInvalid(`must sum to ${restrictions.sum}`, value);
  }

  if (restrictions.ordered && !validateOrderedRule(normalizedArray, restrictions.ordered)) {
    return toInvalid(`must satisfy ordered rule '${restrictions.ordered}'`, value);
  }

  if (!isAllowedValue(normalizedArray, restrictions.allowed)) {
    return toInvalid("contains values outside allowed options", value);
  }

  return toValid(normalizedArray);
};
