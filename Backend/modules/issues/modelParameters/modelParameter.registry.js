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
import { validateAndNormalizeCriterionMapParameter } from "./handlers/criterionMap.parameter.js";
import { normalizeNonEmptyString } from "./modelParameter.shared.js";

export const MODEL_PARAMETER_STRUCTURE_REGISTRY = new Map([
  ["numberGlobal", validateAndNormalizeNumberParameter],
  ["integerGlobal", validateAndNormalizeIntegerParameter],
  ["booleanGlobal", validateAndNormalizeBooleanParameter],
  ["stringGlobal", validateAndNormalizeStringParameter],
  ["selectGlobal", validateAndNormalizeEnumParameter],
  ["intervalGlobal", validateAndNormalizeIntervalParameter],
  ["arrayGlobal", validateAndNormalizeArrayParameter],
  ["arrayPerCriterion", validateAndNormalizeArrayParameter],
  ["fuzzyArrayGlobal", validateAndNormalizeFuzzyArrayParameter],
  ["fuzzyArrayPerCriterion", validateAndNormalizeFuzzyArrayParameter],
  ["criteriaWeights", validateAndNormalizeCriteriaWeightsParameter],
  ["fuzzyCriteriaWeights", validateAndNormalizeFuzzyCriteriaWeightsParameter],
  ["criterionMap", validateAndNormalizeCriterionMapParameter],
  ["numberCriterion", validateAndNormalizeCriterionMapParameter],
  ["selectCriterion", validateAndNormalizeCriterionMapParameter],
]);

export const resolveParameterStructureKey = (parameter) => {
  return normalizeNonEmptyString(parameter?.parameterStructureKey);
};
