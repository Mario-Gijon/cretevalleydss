import CriteriaWeightsParameterField from "./CriteriaWeightsParameterField";
import CriteriaWeightsParameterValueView from "./CriteriaWeightsParameterValueView";
import {
  buildCriteriaWeightsDefault,
  syncCriteriaWeightsValueWithExpectedLength,
} from "./criteriaWeights.defaults";
import { validateCriteriaWeightsParameterValue } from "./criteriaWeights.validation";

export const criteriaWeightsParameterHandler = {
  FieldComponent: CriteriaWeightsParameterField,
  ViewComponent: CriteriaWeightsParameterValueView,
  buildDefault: buildCriteriaWeightsDefault,
  updateValue: syncCriteriaWeightsValueWithExpectedLength,
  validate: ({ parameter, value, leafCount }) =>
    validateCriteriaWeightsParameterValue({ parameter, value, leafCount }),
};
