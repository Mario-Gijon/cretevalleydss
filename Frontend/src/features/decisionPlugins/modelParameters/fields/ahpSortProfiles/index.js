import AHPSortProfilesParameterField from "./AHPSortProfilesParameterField.jsx";
import AHPSortProfilesParameterReadOnly from "./AHPSortProfilesParameterReadOnly.jsx";
import AHPSortClassificationParameterGroup from "./AHPSortClassificationParameterGroup.jsx";
import {
  describeAHPSortCategoryChange,
  normalizeAHPSortProfilesValue,
  reconcileAHPSortProfilesAfterCategoryChange,
  validateAHPSortProfilesValue,
} from "./ahpSortProfilesValues.js";

export const ahpSortProfilesParameterField = Object.freeze({
  key: "ahpSortProfiles",
  FieldComponent: AHPSortProfilesParameterField,
  ReadOnlyComponent: AHPSortProfilesParameterReadOnly,
  normalizeValue: normalizeAHPSortProfilesValue,
  validateValue: validateAHPSortProfilesValue,
  valueDependencyStructureKeys: Object.freeze(["orderedCategories"]),
  describeDependencyChange: describeAHPSortCategoryChange,
  reconcileDependencyChange: ({ value, nextContext }) =>
    reconcileAHPSortProfilesAfterCategoryChange({
      value,
      nextCategories: nextContext?.parameterValuesByStructureKey?.orderedCategories?.[0]?.value,
    }),
  parameterGroup: Object.freeze({
    key: "ahpsort-classification",
    memberStructureKeys: Object.freeze(["orderedCategories", "ahpSortProfiles", "ahpSortGroup"]),
    FieldComponent: AHPSortClassificationParameterGroup,
  }),
});
