import AHPSortGroupParameterField from "./AHPSortGroupParameterField.jsx";
import AHPSortGroupParameterReadOnly from "./AHPSortGroupParameterReadOnly.jsx";
import {
  normalizeAHPSortGroupValue,
  validateAHPSortGroupValue,
} from "./normalizeAHPSortGroupValue.js";

export const ahpSortGroupParameterField = Object.freeze({
  key: "ahpSortGroup",
  FieldComponent: AHPSortGroupParameterField,
  ReadOnlyComponent: AHPSortGroupParameterReadOnly,
  normalizeValue: normalizeAHPSortGroupValue,
  validateValue: validateAHPSortGroupValue,
});
