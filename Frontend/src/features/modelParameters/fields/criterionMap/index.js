import CriterionMapParameterField from "./CriterionMapParameterField";
import {
  buildCriterionMapDefault,
  syncCriterionMapValue,
} from "./criterionMap.defaults";
import { validateCriterionMapParameterValue } from "./criterionMap.validation";

export const criterionMapParameterHandler = {
  FieldComponent: CriterionMapParameterField,
  buildDefault: buildCriterionMapDefault,
  updateValue: syncCriterionMapValue,
  validate: ({ parameter, value, leafCriteria }) =>
    validateCriterionMapParameterValue({ parameter, value, leafCriteria }),
};
