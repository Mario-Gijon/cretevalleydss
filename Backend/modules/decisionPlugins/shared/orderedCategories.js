import { isPlainObject } from "../../../utils/common/objects.js";
import { toInvalid, toValid } from "../modelParameters/parameterValidationResult.js";

export const CATEGORY_ORDER_SEMANTICS = "lower-order-is-less-preferred";
const CATEGORY_FIELDS = new Set(["categoryId", "label", "order"]);

const normalizeNonEmptyString = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Validate and canonicalize the common, model-independent category shape.
 * An empty list is allowed here; individual model contracts can require more.
 */
export const validateAndNormalizeOrderedCategories = (
  value,
  { rejectUnknownFields = true } = {}
) => {
  if (!Array.isArray(value)) {
    return toInvalid("must be an array of ordered categories", value);
  }

  const categoryIds = new Set();
  const orders = new Set();
  const categories = [];

  for (const [index, category] of value.entries()) {
    if (!isPlainObject(category)) {
      return toInvalid(`category at index ${index} must be an object`, value);
    }

    const unknownField = rejectUnknownFields
      ? Object.keys(category).find(
          (key) => !CATEGORY_FIELDS.has(key)
        )
      : null;
    if (unknownField) {
      return toInvalid(
        `category at index ${index} contains unsupported field '${unknownField}'`,
        value
      );
    }

    const categoryId = normalizeNonEmptyString(category.categoryId);
    if (!categoryId) {
      return toInvalid(
        `category at index ${index} requires a non-empty categoryId`,
        value
      );
    }
    if (categoryIds.has(categoryId)) {
      return toInvalid(`categoryId '${categoryId}' must be unique`, value);
    }
    categoryIds.add(categoryId);

    const label = normalizeNonEmptyString(category.label);
    if (!label) {
      return toInvalid(
        `category at index ${index} requires a non-empty label`,
        value
      );
    }

    if (!Number.isInteger(category.order) || category.order < 0) {
      return toInvalid(
        `category '${categoryId}' order must be a non-negative integer`,
        value
      );
    }
    if (orders.has(category.order)) {
      return toInvalid(`category order '${category.order}' must be unique`, value);
    }
    orders.add(category.order);
    categories.push({ categoryId, label, order: category.order });
  }

  categories.sort((left, right) => left.order - right.order);
  if (categories.some((category, index) => category.order !== index)) {
    return toInvalid("category orders must be consecutive starting at zero", value);
  }

  return toValid(categories);
};
