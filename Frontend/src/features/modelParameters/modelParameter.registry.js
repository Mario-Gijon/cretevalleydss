import { resolveRegistryKey } from "./modelParameter.metadata";
import NumberParameterField from "./fields/NumberParameterField";
import IntervalParameterField from "./fields/IntervalParameterField";
import ArrayParameterField from "./fields/ArrayParameterField";
import FuzzyArrayParameterField from "./fields/FuzzyArrayParameterField";
import CriteriaWeightsParameterField from "./fields/CriteriaWeightsParameterField";
import EnumParameterField from "./fields/EnumParameterField";

export const MODEL_PARAMETER_FIELD_REGISTRY = {
  criteriaWeights: CriteriaWeightsParameterField,
  number: NumberParameterField,
  integer: NumberParameterField,
  boolean: EnumParameterField,
  enum: EnumParameterField,
  string: EnumParameterField,
  interval: IntervalParameterField,
  "array:global": ArrayParameterField,
  "array:perCriterion": ArrayParameterField,
  "fuzzyArray:global": FuzzyArrayParameterField,
  "fuzzyArray:perCriterion": FuzzyArrayParameterField,
};

export const resolveModelParameterField = (parameter) => {
  const registryKey = resolveRegistryKey(parameter);
  const type = parameter?.type;

  return {
    FieldComponent:
      MODEL_PARAMETER_FIELD_REGISTRY[registryKey] ||
      MODEL_PARAMETER_FIELD_REGISTRY[type] ||
      null,
    registryKey,
  };
};
