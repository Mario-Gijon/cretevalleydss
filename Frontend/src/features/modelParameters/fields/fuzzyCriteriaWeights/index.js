import FuzzyCriteriaWeightsParameterField from "./FuzzyCriteriaWeightsParameterField";
import FuzzyCriteriaWeightsParameterValueView from "./FuzzyCriteriaWeightsParameterValueView";
import {
  buildFuzzyCriteriaWeightsDefault,
  syncFuzzyCriteriaWeightsValueWithExpectedLength,
} from "./fuzzyCriteriaWeights.defaults";
import { validateFuzzyCriteriaWeightsParameterValue } from "./fuzzyCriteriaWeights.validation";

export const fuzzyCriteriaWeightsParameterHandler = {
  FieldComponent: FuzzyCriteriaWeightsParameterField,
  ViewComponent: FuzzyCriteriaWeightsParameterValueView,
  buildDefault: buildFuzzyCriteriaWeightsDefault,
  updateValue: syncFuzzyCriteriaWeightsValueWithExpectedLength,
  validate: ({ parameter, value, leafCount }) =>
    validateFuzzyCriteriaWeightsParameterValue({ parameter, value, leafCount }),
};
