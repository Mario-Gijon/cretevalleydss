import { normalizeExpressionDomainNameOrThrow } from "../../shared/validation.js";
import { normalizeNumericContinuousCreationDefinition } from "./creation.js";
import {
  assertNumericContinuousValueInRange,
  getNumericContinuousEvaluationDefinition,
  normalizeNumericContinuousEvaluationValue,
} from "./evaluation.js";

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
    const normalizedValue = normalizeNumericContinuousEvaluationValue(value);
    const definition = getNumericContinuousEvaluationDefinition(expressionDomain);

    assertNumericContinuousValueInRange({
      value: normalizedValue,
      definition,
    });

    return normalizedValue;
  },
});
