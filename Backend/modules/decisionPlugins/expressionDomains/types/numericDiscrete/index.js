import { normalizeExpressionDomainNameOrThrow } from "../../shared/validation.js";
import { normalizeNumericDiscreteCreationDefinition } from "./creation.js";
import {
  assertNumericDiscreteValueInRange,
  assertNumericDiscreteValueStepAligned,
  normalizeNumericDiscreteEvaluationValue,
} from "./evaluation.js";

const getValidatedNumericDiscreteValue = ({ value, expressionDomain } = {}) => {
  const normalizedValue = normalizeNumericDiscreteEvaluationValue(value);
  const definition = getNumericDiscreteEvaluationDefinition(expressionDomain);

  assertNumericDiscreteValueInRange({
    value: normalizedValue,
    definition,
  });

  assertNumericDiscreteValueStepAligned({
    value: normalizedValue,
    definition,
  });

  return normalizedValue;
};
export const numericDiscrete = Object.freeze({
  key: "numericDiscrete",
  label: "Numeric Discrete",
  description: "Discrete numeric domain constrained by minimum, maximum, and step.",
  family: "numeric",

  validateCreation(payload = {}) {
    const name = normalizeExpressionDomainNameOrThrow(payload?.name);
    const definition = normalizeNumericDiscreteCreationDefinition(
      payload?.definition
    );

    return {
      name,
      typeKey: "numericDiscrete",
      family: "numeric",
      definition,
    };
  },

  validateEvaluation({ value, expressionDomain } = {}) {
    return getValidatedNumericDiscreteValue({
      value,
      expressionDomain,
    });
  },
});
