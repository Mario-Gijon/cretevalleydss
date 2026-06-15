import {
  normalizeNonEmptyString,
  normalizeNumberValue,
} from "../parameterValues.js";
import {
  resolveExpectedArrayLength,
  validateOrderedRule,
} from "../parameterRestrictions.js";
import { toInvalid, toValid } from "../parameterValidationResult.js";

export const validateAndNormalizeFuzzyArrayParameter = ({ value, parameter, context }) => {
  const restrictions = parameter?.restrictions || {};

  if (!Array.isArray(value)) {
    return toInvalid("must be an array of fuzzy triples", value);
  }

  const expectedLength = resolveExpectedArrayLength({
    parameter,
    leafCriteriaCount: context.leafCriteriaCount,
    alternativesCount: context.alternativesCount,
  });

  if (expectedLength !== null && value.length !== expectedLength) {
    return toInvalid(`must contain exactly ${expectedLength} fuzzy values`, value);
  }

  const orderedRule = normalizeNonEmptyString(restrictions.ordered) || "nonDecreasing";
  const normalized = [];

  for (let index = 0; index < value.length; index += 1) {
    const triangle = value[index];
    if (!Array.isArray(triangle) || triangle.length !== 3) {
      return toInvalid(`[${index}] must be an array [l,m,u]`, triangle);
    }

    const normalizedTriangle = triangle.map((item) => normalizeNumberValue(item));
    if (normalizedTriangle.some((item) => item === null)) {
      return toInvalid(`[${index}] must contain finite numeric values`, triangle);
    }

    if (
      typeof restrictions.min === "number" &&
      normalizedTriangle.some((item) => item < restrictions.min)
    ) {
      return toInvalid(`[${index}] contains values below min ${restrictions.min}`, triangle);
    }

    if (
      typeof restrictions.max === "number" &&
      normalizedTriangle.some((item) => item > restrictions.max)
    ) {
      return toInvalid(`[${index}] contains values above max ${restrictions.max}`, triangle);
    }

    if (!validateOrderedRule(normalizedTriangle, orderedRule)) {
      return toInvalid(`[${index}] must satisfy ordered rule '${orderedRule}'`, triangle);
    }

    normalized.push(normalizedTriangle);
  }

  return toValid(normalized);
};
