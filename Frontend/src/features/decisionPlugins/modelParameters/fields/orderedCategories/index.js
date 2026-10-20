import OrderedCategoriesParameterField from "./OrderedCategoriesParameterField.jsx";
import OrderedCategoriesParameterReadOnly from "./OrderedCategoriesParameterReadOnly.jsx";
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
});
