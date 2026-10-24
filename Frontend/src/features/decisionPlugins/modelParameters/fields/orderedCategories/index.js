import OrderedCategoriesParameterField from "./OrderedCategoriesParameterField.jsx";
import OrderedCategoriesParameterReadOnly from "./OrderedCategoriesParameterReadOnly.jsx";
import OrderedClassificationParameterGroup from "./OrderedClassificationParameterGroup.jsx";
import {
  normalizeOrderedCategoriesValue,
  validateOrderedCategoriesValue,
} from "./orderedCategoriesValues.js";

export const orderedCategoriesParameterField = Object.freeze({
  key: "orderedCategories",
  FieldComponent: OrderedCategoriesParameterField,
  ReadOnlyComponent: OrderedCategoriesParameterReadOnly,
  normalizeValue: normalizeOrderedCategoriesValue,
  validateValue: validateOrderedCategoriesValue,
  parameterGroup: Object.freeze({
    key: "ordered-classification",
    memberStructureKeys: Object.freeze(["orderedCategories", "boundaryProfiles"]),
    FieldComponent: OrderedClassificationParameterGroup,
  }),
});
