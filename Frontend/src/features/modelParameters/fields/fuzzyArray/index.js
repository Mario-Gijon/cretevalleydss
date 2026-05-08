import FuzzyArrayParameterField from "./FuzzyArrayParameterField";
import { buildFuzzyArrayDefault, updateFuzzyArrayValue } from "./fuzzyArray.defaults";

export const fuzzyArrayParameterHandler = {
  FieldComponent: FuzzyArrayParameterField,
  buildDefault: buildFuzzyArrayDefault,
  updateValue: updateFuzzyArrayValue,
};
