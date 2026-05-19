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
  numberGlobal: numberParameterHandler,
  integerGlobal: numberParameterHandler,
  booleanGlobal: enumParameterHandler,
  selectGlobal: enumParameterHandler,
  stringGlobal: enumParameterHandler,
  intervalGlobal: intervalParameterHandler,
  arrayGlobal: arrayParameterHandler,
  arrayPerCriterion: arrayParameterHandler,
  fuzzyArrayGlobal: fuzzyArrayParameterHandler,
  fuzzyArrayPerCriterion: fuzzyArrayParameterHandler,
};

export const MODEL_PARAMETER_ADAPTER_REGISTRY = MODEL_PARAMETER_HANDLER_REGISTRY;
