import { numberParameterHandler } from "./fields/number";
import { intervalParameterHandler } from "./fields/interval";
import { enumParameterHandler } from "./fields/enum";
import { arrayParameterHandler } from "./fields/array";
import { fuzzyArrayParameterHandler } from "./fields/fuzzyArray";
import { criteriaWeightsParameterHandler } from "./fields/criteriaWeights";
import { fuzzyCriteriaWeightsParameterHandler } from "./fields/fuzzyCriteriaWeights";

export const MODEL_PARAMETER_HANDLER_REGISTRY = {
  criteriaWeights: criteriaWeightsParameterHandler,
  fuzzyCriteriaWeights: fuzzyCriteriaWeightsParameterHandler,
  "number:global": numberParameterHandler,
  "integer:global": numberParameterHandler,
  "boolean:global": enumParameterHandler,
  "enum:global": enumParameterHandler,
  "string:global": enumParameterHandler,
  "interval:global": intervalParameterHandler,
  "array:global": arrayParameterHandler,
  "array:perCriterion": arrayParameterHandler,
  "fuzzyArray:global": fuzzyArrayParameterHandler,
  "fuzzyArray:perCriterion": fuzzyArrayParameterHandler,
};

export const MODEL_PARAMETER_ADAPTER_REGISTRY = MODEL_PARAMETER_HANDLER_REGISTRY;
