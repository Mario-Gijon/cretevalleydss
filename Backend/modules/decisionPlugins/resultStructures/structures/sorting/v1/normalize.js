import { createInternalError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";
import {
  CATEGORY_ORDER_SEMANTICS,
  validateAndNormalizeOrderedCategories,
} from "../../../../shared/orderedCategories.js";

export const SORTING_CATEGORY_ORDER_SEMANTICS = CATEGORY_ORDER_SEMANTICS;

const throwInvalid = (message, field) => {
  throw createInternalError(message, { field });
};

const normalizeRequiredId = (value, message, field) => {
  const id = normalizeNonEmptyString(value);
  if (!id) throwInvalid(message, field);
  return id;
};

const normalizePlotsGraphic = (value) => {
  if (!isPlainObject(value)) {
    throwInvalid("Sorting plotsGraphic must be an object", "result.plotsGraphic");
  }
  if (Object.hasOwn(value, "reason")) {
    const reason = normalizeNonEmptyString(value.reason);
    if (!reason) {
      throwInvalid("Sorting plotsGraphic.reason must be a non-empty string", "result.plotsGraphic.reason");
    }
    return { reason };
  }

  const expertPoints = value.expert_points;
  const collectivePoint = value.collective_point;
  const validPoint = (point) =>
    Array.isArray(point) &&
    point.length === 2 &&
    point.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate));
  if (
    !Array.isArray(expertPoints) ||
    expertPoints.length === 0 ||
    !expertPoints.every(validPoint) ||
    !validPoint(collectivePoint)
  ) {
    throwInvalid(
      "Sorting plotsGraphic must contain finite two-dimensional expert and collective points",
      "result.plotsGraphic",
    );
  }

  const normalized = {
    expert_points: expertPoints.map((point) => [...point]),
    collective_point: [...collectivePoint],
  };
  if (Object.hasOwn(value, "expert_ids")) {
    const ids = value.expert_ids;
    const normalizedIds = Array.isArray(ids)
      ? ids.map((id) => normalizeNonEmptyString(id))
      : [];
    if (
      !Array.isArray(ids) ||
      ids.length !== expertPoints.length ||
      normalizedIds.some((id) => !id) ||
      new Set(normalizedIds).size !== normalizedIds.length
    ) {
      throwInvalid("Sorting plotsGraphic.expert_ids must be unique non-empty IDs matching the expert points", "result.plotsGraphic.expert_ids");
    }
    normalized.expert_ids = normalizedIds;
  }
  for (const field of ["expert_labels", "expert_emails"]) {
    if (!Object.hasOwn(value, field)) continue;
    const entries = value[field];
    const validEntry = field === "expert_emails"
      ? (entry) => entry === null || typeof entry === "string"
      : (entry) => typeof entry === "string" && Boolean(entry.trim());
    if (
      !Array.isArray(entries) ||
      entries.length !== expertPoints.length ||
      !entries.every(validEntry)
    ) {
      throwInvalid(`Sorting plotsGraphic.${field} must match the expert points`, `result.plotsGraphic.${field}`);
    }
    normalized[field] = entries.map((entry) => typeof entry === "string" ? entry.trim() : null);
  }
  if (Object.hasOwn(value, "projection_space")) {
    const projectionSpace = normalizeNonEmptyString(value.projection_space);
    if (!projectionSpace) {
      throwInvalid("Sorting plotsGraphic.projection_space must be a non-empty string", "result.plotsGraphic.projection_space");
    }
    normalized.projection_space = projectionSpace;
  }
  return normalized;
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

const resolveAuthorizedCategories = (context) => {
  if (!Array.isArray(context?.authorizedCategories)) {
    throwInvalid(
      "Sorting result validation requires Backend-authorized categories",
      "context.authorizedCategories"
    );
  }

  const normalized = validateAndNormalizeOrderedCategories(
    context.authorizedCategories
  );
  if (!normalized.ok) {
    throwInvalid(
      `Backend-authorized sorting categories ${normalized.message}`,
      "context.authorizedCategories"
    );
  }
  return normalized.value;
};

export const normalizeSortingResult = ({ result, context }) => {
  if (!isPlainObject(result)) {
    throwInvalid("Model execution result must be an object", "result");
  }

  const authorizedAlternativeIds = resolveAuthorizedAlternativeIds(context);
  const authorizedAlternativeIdSet = new Set(authorizedAlternativeIds);
  const authorizedCategories = resolveAuthorizedCategories(context);

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

  const normalizedCategories = validateAndNormalizeOrderedCategories(
    result.categories,
    { rejectUnknownFields: false }
  );
  if (!normalizedCategories.ok) {
    throwInvalid(
      `Sorting result ${normalizedCategories.message}`,
      "result.categories"
    );
  }
  const resultCategories = normalizedCategories.value;
  const categoriesMatchAuthorization =
    resultCategories.length === authorizedCategories.length &&
    resultCategories.every((category, index) => {
      const authorized = authorizedCategories[index];
      return (
        category.categoryId === authorized.categoryId &&
        category.label === authorized.label &&
        category.order === authorized.order
      );
    });
  if (!categoriesMatchAuthorization) {
    throwInvalid(
      "Sorting result categories must exactly match Backend-authorized categories",
      "result.categories"
    );
  }
  const categories = authorizedCategories;
  const categoryIds = new Set(categories.map((category) => category.categoryId));

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

  const plotsGraphic = Object.hasOwn(result, "plotsGraphic")
    ? normalizePlotsGraphic(result.plotsGraphic)
    : undefined;

  return {
    categories,
    categoryOrderSemantics: SORTING_CATEGORY_ORDER_SEMANTICS,
    assignments,
    ...(Object.hasOwn(result, "diagnostics")
      ? { diagnostics: result.diagnostics }
      : {}),
    ...(plotsGraphic !== undefined ? { plotsGraphic } : {}),
  };
};
