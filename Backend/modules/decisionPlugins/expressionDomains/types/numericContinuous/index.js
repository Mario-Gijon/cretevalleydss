import { normalizeExpressionDomainNameOrThrow } from "../../shared/validation.js";
import { normalizeNumericContinuousCreationDefinition } from "./creation.js";
import {
  assertNumericContinuousValueInRange,
  normalizeNumericContinuousEvaluationValue,
} from "./evaluation.js";

const getValidatedNumericContinuousValue = ({ value, expressionDomain } = {}) => {
  const normalizedValue = normalizeNumericContinuousEvaluationValue(value);
  const definition = getNumericContinuousEvaluationDefinition(expressionDomain);

  assertNumericContinuousValueInRange({
    value: normalizedValue,
    definition,
  });

  return normalizedValue;
};
export const numericContinuous = Object.freeze({
  key: "numericContinuous",
  label: "Numeric Continuous",
  description: "Continuous numeric domain with a minimum and maximum value.",
  family: "numeric",

  validateCreation(payload = {}) {
    const name = normalizeExpressionDomainNameOrThrow(payload?.name);
    const definition = normalizeNumericContinuousCreationDefinition(
      payload?.definition
    );

    return {
      name,
      typeKey: "numericContinuous",
      family: "numeric",
      definition,
    };
  },

  validateEvaluation({ value, expressionDomain } = {}) {
    return getValidatedNumericContinuousValue({
      value,
      expressionDomain,
    });
  },
});
