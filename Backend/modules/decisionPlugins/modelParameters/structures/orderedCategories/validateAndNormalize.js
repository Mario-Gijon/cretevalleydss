import { validateAndNormalizeOrderedCategories } from "../../../shared/orderedCategories.js";

export const validateAndNormalizeOrderedCategoriesParameter = ({ value }) =>
  validateAndNormalizeOrderedCategories(value);
