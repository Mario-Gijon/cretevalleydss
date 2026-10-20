import { isPlainObject } from "../../../../../utils/common/objects.js";
import { validateAndNormalizeOrderedCategories } from "../../../shared/orderedCategories.js";

export const validateOrderedCategoriesDefinition = (parameter) => {
  if (!isPlainObject(parameter)) return "parameter must be an object";
  if (!Object.hasOwn(parameter, "default")) return null;

  const result = validateAndNormalizeOrderedCategories(parameter.default);
  return result.ok ? null : `default ${result.message}`;
};
