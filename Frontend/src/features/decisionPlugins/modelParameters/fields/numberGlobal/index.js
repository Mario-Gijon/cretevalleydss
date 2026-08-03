import NumberGlobalParameterField from "./NumberGlobalParameterField";
import NumberGlobalParameterReadOnly from "./NumberGlobalParameterReadOnly";

export const numberGlobalParameterField = Object.freeze({
  key: "numberGlobal",
  scenarioKind: "number",
  FieldComponent: NumberGlobalParameterField,
  ReadOnlyComponent: NumberGlobalParameterReadOnly,
});
