import SelectGlobalParameterField from "./SelectGlobalParameterField";
import SelectGlobalParameterReadOnly from "./SelectGlobalParameterReadOnly";

export const selectGlobalParameterField = Object.freeze({
  key: "selectGlobal",
  scenarioKind: "enum",
  FieldComponent: SelectGlobalParameterField,
  ReadOnlyComponent: SelectGlobalParameterReadOnly,
});
