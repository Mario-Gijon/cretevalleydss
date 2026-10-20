import BoundaryProfilesParameterField from "./BoundaryProfilesParameterField.jsx";
import BoundaryProfilesParameterReadOnly from "./BoundaryProfilesParameterReadOnly.jsx";
import {
  normalizeBoundaryProfilesValue,
  reconcileBoundaryProfilesAfterCategoryChange,
  validateBoundaryProfilesValue,
} from "./boundaryProfilesValues.js";

export const boundaryProfilesParameterField = Object.freeze({
  key: "boundaryProfiles",
  FieldComponent: BoundaryProfilesParameterField,
  ReadOnlyComponent: BoundaryProfilesParameterReadOnly,
  normalizeValue: normalizeBoundaryProfilesValue,
  validateValue: validateBoundaryProfilesValue,
  valueDependencyStructureKeys: ["orderedCategories"],
  reconcileDependencyChange: ({ value, previousContext, nextContext }) =>
    reconcileBoundaryProfilesAfterCategoryChange({
      value,
      previousCategories: previousContext?.parameterValuesByStructureKey?.orderedCategories?.[0]?.value,
      nextCategories: nextContext?.parameterValuesByStructureKey?.orderedCategories?.[0]?.value,
      leafCriteria: nextContext?.leafCriteria,
    }),
});
