import { validateAndNormalizeOrderedCategoriesParameter } from "./validateAndNormalize.js";
import { validateOrderedCategoriesDefinition } from "./validateDefinition.js";

export const orderedCategoriesParameterStructure = Object.freeze({
  key: "orderedCategories",
  implementationStatus: "ready",
  validateDefinition: validateOrderedCategoriesDefinition,
  validateAndNormalize: validateAndNormalizeOrderedCategoriesParameter,
});
