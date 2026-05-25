import NumberGlobalParameterField from "./fields/numberGlobal/NumberGlobalParameterField";
import SelectGlobalParameterField from "./fields/selectGlobal/SelectGlobalParameterField";
import IntervalGlobalParameterField from "./fields/intervalGlobal/IntervalGlobalParameterField";

export const PARAMETER_FIELD_REGISTRY = Object.freeze({
  numberGlobal: NumberGlobalParameterField,
  selectGlobal: SelectGlobalParameterField,
  intervalGlobal: IntervalGlobalParameterField,
});

export const resolveParameterField = (parameter) => {
  const parameterKey = parameter?.key || "unknown";
  const structureKey =
    typeof parameter?.parameterStructureKey === "string"
      ? parameter.parameterStructureKey.trim()
      : "";

  if (!structureKey) {
    throw new Error(
      `[modelParameters] Missing parameterStructureKey for parameter "${parameterKey}".`
    );
  }

  const FieldComponent = PARAMETER_FIELD_REGISTRY[structureKey];

  if (!FieldComponent) {
    throw new Error(
      `[modelParameters] Unsupported parameterStructureKey "${structureKey}" for parameter "${parameterKey}".`
    );
  }

  return FieldComponent;
};
