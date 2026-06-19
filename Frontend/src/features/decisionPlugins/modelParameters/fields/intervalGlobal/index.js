import IntervalGlobalParameterField from "./IntervalGlobalParameterField";
import IntervalGlobalParameterReadOnly from "./IntervalGlobalParameterReadOnly";

export const intervalGlobalParameterField = Object.freeze({
  key: "intervalGlobal",
  FieldComponent: IntervalGlobalParameterField,
  ReadOnlyComponent: IntervalGlobalParameterReadOnly,
});
