import NumberGlobalParameterField from "./fields/numberGlobal/NumberGlobalParameterField";
import NumberGlobalParameterReadOnly from "./fields/numberGlobal/NumberGlobalParameterReadOnly";
import SelectGlobalParameterField from "./fields/selectGlobal/SelectGlobalParameterField";
import SelectGlobalParameterReadOnly from "./fields/selectGlobal/SelectGlobalParameterReadOnly";
import IntervalGlobalParameterField from "./fields/intervalGlobal/IntervalGlobalParameterField";
import IntervalGlobalParameterReadOnly from "./fields/intervalGlobal/IntervalGlobalParameterReadOnly";
import NumberCriterionParameterField from "./fields/numberCriterion/NumberCriterionParameterField";
import NumberCriterionParameterReadOnly from "./fields/numberCriterion/NumberCriterionParameterReadOnly";
import SelectCriterionParameterField from "./fields/selectCriterion/SelectCriterionParameterField";
import SelectCriterionParameterReadOnly from "./fields/selectCriterion/SelectCriterionParameterReadOnly";

export const PARAMETER_FIELD_REGISTRY = Object.freeze({
  numberGlobal: {
    FieldComponent: NumberGlobalParameterField,
    ReadOnlyComponent: NumberGlobalParameterReadOnly,
  },
  selectGlobal: {
    FieldComponent: SelectGlobalParameterField,
    ReadOnlyComponent: SelectGlobalParameterReadOnly,
  },
  intervalGlobal: {
    FieldComponent: IntervalGlobalParameterField,
    ReadOnlyComponent: IntervalGlobalParameterReadOnly,
  },
  numberCriterion: {
    FieldComponent: NumberCriterionParameterField,
    ReadOnlyComponent: NumberCriterionParameterReadOnly,
  },
  selectCriterion: {
    FieldComponent: SelectCriterionParameterField,
    ReadOnlyComponent: SelectCriterionParameterReadOnly,
  },
});

export const resolveParameterFieldEntry = (parameter) => {
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

  const entry = PARAMETER_FIELD_REGISTRY[structureKey];

  if (!entry) {
    throw new Error(
      `[modelParameters] Unsupported parameterStructureKey "${structureKey}" for parameter "${parameterKey}".`
    );
  }

  return entry;
};

export const resolveParameterField = (parameter) =>
  resolveParameterFieldEntry(parameter).FieldComponent;
