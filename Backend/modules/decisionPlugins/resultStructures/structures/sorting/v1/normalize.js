import { createInternalError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";

export const SORTING_CATEGORY_ORDER_SEMANTICS =
  "lower-order-is-less-preferred";

const throwInvalid = (message, field) => {
  throw createInternalError(message, { field });
};

const normalizeRequiredId = (value, message, field) => {
  const id = normalizeNonEmptyString(value);
  if (!id) throwInvalid(message, field);
  return id;
};

const resolveAuthorizedAlternativeIds = (context) => {
  if (!Array.isArray(context?.authorizedAlternativeIds)) {
    throwInvalid(
      "Sorting result validation requires Backend-authorized alternative IDs",
      "context.authorizedAlternativeIds"
    );
  }

  const ids = context.authorizedAlternativeIds.map((value, index) =>
    normalizeRequiredId(
      value,
      "Each authorized alternative ID must be a non-empty string",
      `context.authorizedAlternativeIds[${index}]`
    )
  );

  if (new Set(ids).size !== ids.length) {
    throwInvalid(
      "Backend-authorized alternative IDs must be unique",
      "context.authorizedAlternativeIds"
    );
  }

  return ids;
};

export const normalizeSortingResult = ({ result, context }) => {
  if (!isPlainObject(result)) {
    throwInvalid("Model execution result must be an object", "result");
  }

  const authorizedAlternativeIds = resolveAuthorizedAlternativeIds(context);
  const authorizedAlternativeIdSet = new Set(authorizedAlternativeIds);

  if (!Array.isArray(result.categories) || result.categories.length === 0) {
    throwInvalid(
      "Model execution result.categories must be a non-empty array",
      "result.categories"
    );
  }

  if (
    Object.hasOwn(result, "categoryOrderSemantics") &&
    result.categoryOrderSemantics !== SORTING_CATEGORY_ORDER_SEMANTICS
  ) {
    throwInvalid(
      `categoryOrderSemantics must be '${SORTING_CATEGORY_ORDER_SEMANTICS}'`,
      "result.categoryOrderSemantics"
    );
  }

  const categoryIds = new Set();
  const categoryOrders = new Set();
  const categories = result.categories.map((category, index) => {
    if (!isPlainObject(category)) {
      throwInvalid(
        "Each sorting category must be an object",
        `result.categories[${index}]`
      );
    }

    const categoryId = normalizeRequiredId(
      category.categoryId,
      "Each sorting category requires a non-empty categoryId",
      `result.categories[${index}].categoryId`
    );
    if (categoryIds.has(categoryId)) {
      throwInvalid(
        "Sorting category IDs must be unique",
        `result.categories[${index}].categoryId`
      );
    }
    categoryIds.add(categoryId);

    const label = normalizeRequiredId(
      category.label,
      "Each sorting category requires a non-empty label",
      `result.categories[${index}].label`
    );

    if (!Number.isInteger(category.order) || category.order < 0) {
      throwInvalid(
        "Sorting category order must be a non-negative integer",
        `result.categories[${index}].order`
      );
    }
    if (categoryOrders.has(category.order)) {
      throwInvalid(
        "Sorting category orders must be unique",
        `result.categories[${index}].order`
      );
    }
    categoryOrders.add(category.order);

    return { categoryId, label, order: category.order };
  });

  categories.sort((left, right) => left.order - right.order);
  if (categories.some((category, index) => category.order !== index)) {
    throwInvalid(
      "Sorting category orders must be consecutive starting at zero",
      "result.categories"
    );
  }

  if (!Array.isArray(result.assignments)) {
    throwInvalid(
      "Model execution result.assignments must be an array",
      "result.assignments"
    );
  }

  const assignedAlternativeIds = new Set();
  const assignments = result.assignments.map((assignment, index) => {
    if (!isPlainObject(assignment)) {
      throwInvalid(
        "Each sorting assignment must be an object",
        `result.assignments[${index}]`
      );
    }

    const alternativeId = normalizeRequiredId(
      assignment.alternativeId,
      "Each sorting assignment requires a non-empty alternativeId",
      `result.assignments[${index}].alternativeId`
    );
    if (!authorizedAlternativeIdSet.has(alternativeId)) {
      throwInvalid(
        "Sorting assignment references an alternative not authorized for this execution",
        `result.assignments[${index}].alternativeId`
      );
    }
    if (assignedAlternativeIds.has(alternativeId)) {
      throwInvalid(
        "Each alternative may have only one sorting assignment",
        `result.assignments[${index}].alternativeId`
      );
    }
    assignedAlternativeIds.add(alternativeId);

    const categoryId = normalizeRequiredId(
      assignment.categoryId,
      "Each sorting assignment requires a non-empty categoryId",
      `result.assignments[${index}].categoryId`
    );
    if (!categoryIds.has(categoryId)) {
      throwInvalid(
        "Sorting assignment references an unknown category",
        `result.assignments[${index}].categoryId`
      );
    }

    return { alternativeId, categoryId };
  });

  const missingAlternativeId = authorizedAlternativeIds.find(
    (alternativeId) => !assignedAlternativeIds.has(alternativeId)
  );
  if (missingAlternativeId) {
    throwInvalid(
      "Every Backend-authorized alternative must have exactly one sorting assignment",
      "result.assignments"
    );
  }

  const authorizedAlternativeOrder = new Map(
    authorizedAlternativeIds.map((alternativeId, index) => [alternativeId, index])
  );
  assignments.sort(
    (left, right) =>
      authorizedAlternativeOrder.get(left.alternativeId) -
      authorizedAlternativeOrder.get(right.alternativeId)
  );

  if (Object.hasOwn(result, "diagnostics") && !isPlainObject(result.diagnostics)) {
    throwInvalid(
      "Sorting diagnostics must be an object when provided",
      "result.diagnostics"
    );
  }

  return {
    categories,
    categoryOrderSemantics: SORTING_CATEGORY_ORDER_SEMANTICS,
    assignments,
    ...(Object.hasOwn(result, "diagnostics")
      ? { diagnostics: result.diagnostics }
      : {}),
  };
};
