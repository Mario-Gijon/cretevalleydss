import { validateAndNormalizeNumberParameter } from "./handlers/number.parameter.js";
import { validateAndNormalizeIntegerParameter } from "./handlers/integer.parameter.js";
import { validateAndNormalizeBooleanParameter } from "./handlers/boolean.parameter.js";
import { validateAndNormalizeStringParameter } from "./handlers/string.parameter.js";
import { validateAndNormalizeEnumParameter } from "./handlers/enum.parameter.js";
import { validateAndNormalizeIntervalParameter } from "./handlers/interval.parameter.js";
import { validateAndNormalizeArrayParameter } from "./handlers/array.parameter.js";
import { validateAndNormalizeFuzzyArrayParameter } from "./handlers/fuzzyArray.parameter.js";
import { validateAndNormalizeCriteriaWeightsParameter } from "./handlers/criteriaWeights.parameter.js";
import { validateAndNormalizeFuzzyCriteriaWeightsParameter } from "./handlers/fuzzyCriteriaWeights.parameter.js";
import { normalizeNonEmptyString } from "./modelParameter.shared.js";

export const MODEL_PARAMETER_HANDLER_REGISTRY = new Map([
  ["number:global", validateAndNormalizeNumberParameter],
  ["integer:global", validateAndNormalizeIntegerParameter],
  ["boolean:global", validateAndNormalizeBooleanParameter],
  ["string:global", validateAndNormalizeStringParameter],
  ["enum:global", validateAndNormalizeEnumParameter],
  ["interval:global", validateAndNormalizeIntervalParameter],
  ["array:global", validateAndNormalizeArrayParameter],
  ["array:perCriterion", validateAndNormalizeArrayParameter],
  ["fuzzyArray:global", validateAndNormalizeFuzzyArrayParameter],
  ["fuzzyArray:perCriterion", validateAndNormalizeFuzzyArrayParameter],
  ["criteriaWeights", validateAndNormalizeCriteriaWeightsParameter],
  ["fuzzyCriteriaWeights", validateAndNormalizeFuzzyCriteriaWeightsParameter],
]);

export const resolveHandlerKey = (parameter) => {
  const semanticRole = normalizeNonEmptyString(parameter?.semanticRole);
  const parameterType = normalizeNonEmptyString(parameter?.type);
  const scope = normalizeNonEmptyString(parameter?.scope);

  if (semanticRole === "criteriaWeights" && parameterType === "fuzzyArray") {
    return "fuzzyCriteriaWeights";
  }

  if (semanticRole === "criteriaWeights") {
    return "criteriaWeights";
  }

  if (!parameterType || !scope) {
    return null;
  }

  return `${parameterType}:${scope}`;
};
