import NumberGlobalParameterField from "./NumberGlobalParameterField";
import NumberGlobalParameterReadOnly from "./NumberGlobalParameterReadOnly";

export const numberGlobalParameterField = Object.freeze({
  key: "numberGlobal",
  FieldComponent: NumberGlobalParameterField,
  ReadOnlyComponent: NumberGlobalParameterReadOnly,
});
