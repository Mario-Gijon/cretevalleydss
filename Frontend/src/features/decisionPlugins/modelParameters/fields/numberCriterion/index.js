import NumberCriterionParameterField from "./NumberCriterionParameterField";
import NumberCriterionParameterReadOnly from "./NumberCriterionParameterReadOnly";

export const numberCriterionParameterField = Object.freeze({
  key: "numberCriterion",
  scenarioKind: "criterionMap",
  FieldComponent: NumberCriterionParameterField,
  ReadOnlyComponent: NumberCriterionParameterReadOnly,
});
