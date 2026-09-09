import NumberCriterionParameterField from "./NumberCriterionParameterField";
import NumberCriterionParameterReadOnly from "./NumberCriterionParameterReadOnly";

export const numberCriterionParameterField = Object.freeze({
  key: "numberCriterion",
  semanticCapabilities: ["numericCriteriaValues"],
  FieldComponent: NumberCriterionParameterField,
  ReadOnlyComponent: NumberCriterionParameterReadOnly,
});
