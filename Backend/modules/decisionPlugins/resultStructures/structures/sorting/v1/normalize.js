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
  const normalizedExpertIds = normalized.expert_ids || [];
  const knownExpertIds = new Set(normalizedExpertIds);
  if (Object.hasOwn(value, "identical_evaluation_groups")) {
    const groups = value.identical_evaluation_groups;
    const groupedIds = new Set();
    if (
      !Array.isArray(groups) ||
      !normalizedExpertIds.length ||
      groups.some((group) => {
        if (!Array.isArray(group) || group.length < 2) return true;
        const ids = group.map(normalizeNonEmptyString);
        if (
          ids.some((id) => !id || !knownExpertIds.has(id)) ||
          new Set(ids).size !== ids.length ||
          ids.some((id) => groupedIds.has(id))
        ) return true;
        ids.forEach((id) => groupedIds.add(id));
        return false;
      })
    ) {
      throwInvalid(
        "Sorting plotsGraphic.identical_evaluation_groups must contain disjoint groups of known expert IDs",
        "result.plotsGraphic.identical_evaluation_groups",
      );
    }
    normalized.identical_evaluation_groups = groups.map((group) =>
      group.map((id) => normalizeNonEmptyString(id)),
    );
  }
  if (Object.hasOwn(value, "collective_identical_expert_ids")) {
    const ids = value.collective_identical_expert_ids;
    const normalizedIds = Array.isArray(ids)
      ? ids.map((id) => normalizeNonEmptyString(id))
      : [];
    if (
      !Array.isArray(ids) ||
      !normalizedExpertIds.length ||
      normalizedIds.some((id) => !id || !knownExpertIds.has(id)) ||
      new Set(normalizedIds).size !== normalizedIds.length
    ) {
      throwInvalid(
        "Sorting plotsGraphic.collective_identical_expert_ids must contain unique known expert IDs",
        "result.plotsGraphic.collective_identical_expert_ids",
      );
    }
    normalized.collective_identical_expert_ids = normalizedIds;
  }
  return normalized;
};

const normalizeFiniteNumber = (value, field) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throwInvalid(`${field} must be a finite number`, field);
  }
  return value;
};

const normalizeNumericMetrics = (value, authorizedAlternativeIds) => {
  if (!Array.isArray(value) || value.length === 0) {
    throwInvalid("Sorting numericMetrics must be a non-empty array", "result.numericMetrics");
  }

  const authorizedIds = new Set(authorizedAlternativeIds);
  const identities = new Set();
  return value.map((metric, metricIndex) => {
    const field = `result.numericMetrics[${metricIndex}]`;
    if (!isPlainObject(metric)) {
      throwInvalid("Each sorting numeric metric must be an object", field);
    }
    const allowedFields = new Set([
      "metricId",
      "name",
      "domain",
      "comparability",
      "valuesByAlternativeId",
      "referencesByAlternativeId",
      "scope",
    ]);
    if (Object.keys(metric).some((key) => !allowedFields.has(key))) {
      throwInvalid("Sorting numeric metric contains unsupported fields", field);
    }

    const metricId = normalizeRequiredId(
      metric.metricId,
      "Each sorting numeric metric requires a non-empty metricId",
      `${field}.metricId`,
    );
    const name = normalizeNonEmptyString(metric.name);
    if (!name) throwInvalid("Each sorting numeric metric requires a non-empty name", `${field}.name`);
    if (!isPlainObject(metric.domain) || Object.keys(metric.domain).some((key) => !["min", "max"].includes(key))) {
      throwInvalid("Sorting numeric metric domain must contain min and max only", `${field}.domain`);
    }
    const minimum = normalizeFiniteNumber(metric.domain.min, `${field}.domain.min`);
    const maximum = normalizeFiniteNumber(metric.domain.max, `${field}.domain.max`);
    if (minimum >= maximum) {
      throwInvalid("Sorting numeric metric domain.min must be less than domain.max", `${field}.domain`);
    }

    if (!["acrossAlternatives", "alternativeSpecific"].includes(metric.comparability)) {
      throwInvalid(
        "Sorting numeric metric comparability must be 'acrossAlternatives' or 'alternativeSpecific'",
        `${field}.comparability`,
      );
    }
    if (!isPlainObject(metric.valuesByAlternativeId)) {
      throwInvalid("Sorting numeric metric valuesByAlternativeId must be an object", `${field}.valuesByAlternativeId`);
    }
    const valueIds = Object.keys(metric.valuesByAlternativeId);
    if (valueIds.length !== authorizedAlternativeIds.length || valueIds.some((id) => !authorizedIds.has(id))) {
      throwInvalid(
        "Sorting numeric metric values must cover every Backend-authorized alternative exactly once",
        `${field}.valuesByAlternativeId`,
      );
    }
    const valuesByAlternativeId = Object.fromEntries(authorizedAlternativeIds.map((alternativeId) => {
      const numericValue = normalizeFiniteNumber(
        metric.valuesByAlternativeId[alternativeId],
        `${field}.valuesByAlternativeId.${alternativeId}`,
      );
      if (numericValue < minimum || numericValue > maximum) {
        throwInvalid(
          "Sorting numeric metric value must be within its declared domain",
          `${field}.valuesByAlternativeId.${alternativeId}`,
        );
      }
      return [alternativeId, numericValue];
    }));

    let scope;
    if (Object.hasOwn(metric, "scope")) {
      if (!isPlainObject(metric.scope) || Object.keys(metric.scope).some((key) => !["kind", "id"].includes(key))) {
        throwInvalid("Sorting numeric metric scope must contain kind and id only", `${field}.scope`);
      }
      const kind = normalizeNonEmptyString(metric.scope.kind);
      const id = normalizeNonEmptyString(metric.scope.id);
      if (!kind || !id) throwInvalid("Sorting numeric metric scope requires non-empty kind and id", `${field}.scope`);
      scope = { kind, id };
    }
    const identity = JSON.stringify([metricId, scope?.kind ?? null, scope?.id ?? null]);
    if (identities.has(identity)) {
      throwInvalid("Sorting numeric metric identity and scope must be unique", field);
    }
    identities.add(identity);

    let referencesByAlternativeId;
    if (Object.hasOwn(metric, "referencesByAlternativeId")) {
      if (!isPlainObject(metric.referencesByAlternativeId)) {
        throwInvalid("Sorting numeric metric referencesByAlternativeId must be an object", `${field}.referencesByAlternativeId`);
      }
      const referenceAlternativeIds = Object.keys(metric.referencesByAlternativeId);
      if (referenceAlternativeIds.length !== authorizedAlternativeIds.length || referenceAlternativeIds.some((id) => !authorizedIds.has(id))) {
        throwInvalid(
          "Sorting numeric metric references must cover every Backend-authorized alternative exactly once",
          `${field}.referencesByAlternativeId`,
        );
      }
      referencesByAlternativeId = Object.fromEntries(authorizedAlternativeIds.map((alternativeId) => {
        const rawReferences = metric.referencesByAlternativeId[alternativeId];
        const referenceField = `${field}.referencesByAlternativeId.${alternativeId}`;
        if (!Array.isArray(rawReferences) || rawReferences.length === 0) {
          throwInvalid("Each alternative must have at least one numeric metric reference", referenceField);
        }
        const referenceIds = new Set();
        const references = rawReferences.map((reference, referenceIndex) => {
          const itemField = `${referenceField}[${referenceIndex}]`;
          if (!isPlainObject(reference) || Object.keys(reference).some((key) => !["referenceId", "name", "value"].includes(key))) {
            throwInvalid("Each numeric metric reference must contain referenceId, optional name, and value", itemField);
          }
          const referenceId = normalizeRequiredId(
            reference.referenceId,
            "Each numeric metric reference requires a non-empty referenceId",
            `${itemField}.referenceId`,
          );
          if (referenceIds.has(referenceId)) {
            throwInvalid("Numeric metric reference IDs must be unique per alternative", `${itemField}.referenceId`);
          }
          referenceIds.add(referenceId);
          const numericValue = normalizeFiniteNumber(reference.value, `${itemField}.value`);
          if (numericValue < minimum || numericValue > maximum) {
            throwInvalid("Numeric metric reference value must be within its metric domain", `${itemField}.value`);
          }
          const normalizedReference = { referenceId, value: numericValue };
          if (Object.hasOwn(reference, "name")) {
            const referenceName = normalizeNonEmptyString(reference.name);
            if (!referenceName) throwInvalid("Numeric metric reference name must be non-empty", `${itemField}.name`);
            normalizedReference.name = referenceName;
          }
          return normalizedReference;
        });
        return [alternativeId, references];
      }));
    }

    return {
      metricId,
      name,
      domain: { min: minimum, max: maximum },
      comparability: metric.comparability,
      valuesByAlternativeId,
      ...(referencesByAlternativeId ? { referencesByAlternativeId } : {}),
      ...(scope ? { scope } : {}),
    };
  });
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

const resolveAuthorizedExpertIds = (context) => {
  if (!Array.isArray(context?.authorizedExpertIds)) {
    throwInvalid(
      "Sorting individual assignments require Backend-authorized expert IDs",
      "context.authorizedExpertIds"
    );
  }
  const ids = context.authorizedExpertIds.map((value, index) =>
    normalizeRequiredId(
      value,
      "Each authorized expert ID must be a non-empty string",
      `context.authorizedExpertIds[${index}]`
    )
  );
  if (!ids.length || new Set(ids).size !== ids.length) {
    throwInvalid(
      "Backend-authorized expert IDs must be non-empty and unique",
      "context.authorizedExpertIds"
    );
  }
  return ids;
};

const normalizeIndividualAssignments = ({
  value,
  authorizedExpertIds,
  authorizedAlternativeIds,
  categoryIds,
}) => {
  if (!isPlainObject(value)) {
    throwInvalid(
      "Sorting individualAssignmentsByExpertId must be an object keyed by expert ID",
      "result.individualAssignmentsByExpertId"
    );
  }
  const expertIds = resolveAuthorizedExpertIds({ authorizedExpertIds });
  const returnedExpertIds = Object.keys(value);
  if (returnedExpertIds.length !== expertIds.length || expertIds.some((id) => !Object.hasOwn(value, id))) {
    throwInvalid(
      "Sorting individual assignments must cover every Backend-authorized expert exactly once",
      "result.individualAssignmentsByExpertId"
    );
  }
  return Object.fromEntries(expertIds.map((expertId) => {
    const assignments = value[expertId];
    const field = `result.individualAssignmentsByExpertId.${expertId}`;
    if (!Array.isArray(assignments)) {
      throwInvalid("Each expert's sorting assignments must be an array", field);
    }
    const assigned = new Map();
    assignments.forEach((assignment, index) => {
      const itemField = `${field}[${index}]`;
      if (!isPlainObject(assignment)) {
        throwInvalid("Each individual sorting assignment must be an object", itemField);
      }
      if (Object.keys(assignment).some((key) => !["alternativeId", "categoryId"].includes(key))) {
        throwInvalid("Individual sorting assignments contain unsupported fields", itemField);
      }
      const alternativeId = normalizeRequiredId(
        assignment.alternativeId,
        "Each individual sorting assignment requires an alternativeId",
        `${itemField}.alternativeId`
      );
      const categoryId = normalizeRequiredId(
        assignment.categoryId,
        "Each individual sorting assignment requires a categoryId",
        `${itemField}.categoryId`
      );
      if (!authorizedAlternativeIds.includes(alternativeId)) {
        throwInvalid("Individual sorting assignment references an unauthorized alternative", `${itemField}.alternativeId`);
      }
      if (!categoryIds.has(categoryId)) {
        throwInvalid("Individual sorting assignment references an unknown category", `${itemField}.categoryId`);
      }
      if (assigned.has(alternativeId)) {
        throwInvalid("Each expert may assign an alternative only once", `${itemField}.alternativeId`);
      }
      assigned.set(alternativeId, categoryId);
    });
    if (assigned.size !== authorizedAlternativeIds.length || authorizedAlternativeIds.some((id) => !assigned.has(id))) {
      throwInvalid("Each expert's sorting assignments must cover every authorized alternative exactly once", field);
    }
    return [expertId, authorizedAlternativeIds.map((alternativeId) => ({
      alternativeId,
      categoryId: assigned.get(alternativeId),
    }))];
  }));
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
  const numericMetrics = Object.hasOwn(result, "numericMetrics")
    ? normalizeNumericMetrics(result.numericMetrics, authorizedAlternativeIds)
    : undefined;
  const individualAssignmentsByExpertId = Object.hasOwn(result, "individualAssignmentsByExpertId")
    ? normalizeIndividualAssignments({
        value: result.individualAssignmentsByExpertId,
        authorizedExpertIds: context?.authorizedExpertIds,
        authorizedAlternativeIds,
        categoryIds,
      })
    : undefined;

  return {
    categories,
    categoryOrderSemantics: SORTING_CATEGORY_ORDER_SEMANTICS,
    assignments,
    ...(Object.hasOwn(result, "diagnostics")
      ? { diagnostics: result.diagnostics }
      : {}),
    ...(plotsGraphic !== undefined ? { plotsGraphic } : {}),
    ...(numericMetrics !== undefined ? { numericMetrics } : {}),
    ...(individualAssignmentsByExpertId !== undefined
      ? { individualAssignmentsByExpertId }
      : {}),
  };
};
