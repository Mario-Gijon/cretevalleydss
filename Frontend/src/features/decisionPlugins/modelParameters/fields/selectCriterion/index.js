import SelectCriterionParameterField from "./SelectCriterionParameterField";
import SelectCriterionParameterReadOnly from "./SelectCriterionParameterReadOnly";

export const selectCriterionParameterField = Object.freeze({
  key: "selectCriterion",
  scenarioKind: "criterionMap",
  FieldComponent: SelectCriterionParameterField,
  ReadOnlyComponent: SelectCriterionParameterReadOnly,
});
