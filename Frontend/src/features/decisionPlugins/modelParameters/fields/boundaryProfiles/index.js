import BoundaryProfilesParameterField from "./BoundaryProfilesParameterField.jsx";
import BoundaryProfilesParameterReadOnly from "./BoundaryProfilesParameterReadOnly.jsx";
import {
  normalizeBoundaryProfilesValue,
  reconcileBoundaryProfilesAfterCategoryChange,
  validateBoundaryProfilesValue,
} from "./boundaryProfilesValues.js";

const displayCategory = (category, categories) => {
  const label = category?.label?.trim() || "Unnamed category";
  if (categories.filter((item) => item?.label?.trim() === label).length < 2) return label;
  return `${label} (category ${categories.findIndex((item) => item?.categoryId === category?.categoryId) + 1})`;
};

const describeBoundaryValueResets = ({ value, reconciledValue, previousContext, nextContext }) => {
  const previousCategories = previousContext?.parameterValuesByStructureKey?.orderedCategories?.[0]?.value || [];
  const nextCategories = nextContext?.parameterValuesByStructureKey?.orderedCategories?.[0]?.value || [];
  return (value?.profiles || []).flatMap((profile) => {
    const values = Object.entries(profile?.valuesByCriterionId || {})
      .filter(([, cellValue]) => cellValue !== "" && cellValue !== null && cellValue !== undefined);
    if (!values.length) return [];
    const nextProfile = (reconciledValue?.profiles || []).find((item) => item.profileId === profile.profileId);
    const valuesWereDiscarded = values.some(([criterionId, cellValue]) =>
      nextProfile?.valuesByCriterionId?.[criterionId] !== cellValue
    );
    if (!valuesWereDiscarded) return [];
    const upperIndex = previousCategories.findIndex((category) => category?.categoryId === profile.categoryId);
    const lower = upperIndex > 0 ? previousCategories[upperIndex - 1] : null;
    const upper = previousCategories[upperIndex];
    if (!lower || !upper) return ["Some saved classification reference values will be removed because they no longer match the categories."];
    const nextUpperIndex = nextCategories.findIndex((category) => category?.categoryId === profile.categoryId);
    const nextLower = nextUpperIndex > 0 ? nextCategories[nextUpperIndex - 1] : null;
    const nextUpper = nextCategories[nextUpperIndex];
    if (!nextLower || !nextUpper) {
      return [`Existing values for ${displayCategory(lower, previousCategories)} → ${displayCategory(upper, previousCategories)} will be removed because this boundary no longer exists.`];
    }
    return [`Existing values for ${displayCategory(lower, previousCategories)} → ${displayCategory(upper, previousCategories)} will be reset because its neighboring categories changed.`];
  });
};

export const boundaryProfilesParameterField = Object.freeze({
  key: "boundaryProfiles",
  FieldComponent: BoundaryProfilesParameterField,
  ReadOnlyComponent: BoundaryProfilesParameterReadOnly,
  normalizeValue: normalizeBoundaryProfilesValue,
  validateValue: validateBoundaryProfilesValue,
  valueDependencyStructureKeys: ["orderedCategories"],
  describeDependencyChange: describeBoundaryValueResets,
  reconcileDependencyChange: ({ value, previousContext, nextContext }) =>
    reconcileBoundaryProfilesAfterCategoryChange({
      value,
      previousCategories: previousContext?.parameterValuesByStructureKey?.orderedCategories?.[0]?.value,
      nextCategories: nextContext?.parameterValuesByStructureKey?.orderedCategories?.[0]?.value,
      leafCriteria: nextContext?.leafCriteria,
    }),
});
