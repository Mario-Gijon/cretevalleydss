// Validates the criteriaPreferenceOrder payload against the current leaf criteria.

const isPlainObject = (value) => {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const isNonEmptyString = (value) => (
  typeof value === "string"
  && value.trim().length > 0
);

const getLeafCriterionIdsOrThrow = ({
  decisionContext,
}) => {
  if (
    decisionContext === null
    || typeof decisionContext !== "object"
    || Array.isArray(decisionContext)
  ) {
    throw new TypeError(
      "criteriaPreferenceOrder requires a valid decisionContext.",
    );
  }

  const { leafCriteria } = decisionContext;

  if (!Array.isArray(leafCriteria)) {
    throw new TypeError(
      "criteriaPreferenceOrder requires decisionContext.leafCriteria to be an array.",
    );
  }

  const leafCriterionIds = [];
  const seenIds = new Set();

  for (let index = 0; index < leafCriteria.length; index += 1) {
    const criterion = leafCriteria[index];
    const criterionId = criterion?.id;

    if (!isNonEmptyString(criterionId)) {
      throw new TypeError(
        `criteriaPreferenceOrder requires decisionContext.leafCriteria[${index}].id to be a non-empty string.`,
      );
    }

    if (seenIds.has(criterionId)) {
      throw new Error(
        `criteriaPreferenceOrder decisionContext.leafCriteria contains duplicate criterion ID "${criterionId}".`,
      );
    }

    seenIds.add(criterionId);
    leafCriterionIds.push(criterionId);
  }

  return leafCriterionIds;
};

export const assertCriteriaPreferenceOrderPayloadShapeOrThrow = (
  payload,
) => {
  if (!isPlainObject(payload)) {
    throw new TypeError(
      "criteriaPreferenceOrder payload must be a plain object.",
    );
  }

  const { criterionOrder } = payload;

  if (!Array.isArray(criterionOrder)) {
    throw new TypeError(
      "criteriaPreferenceOrder payload.criterionOrder must be an array.",
    );
  }

  const seenIds = new Set();

  for (let index = 0; index < criterionOrder.length; index += 1) {
    const criterionId = criterionOrder[index];

    if (!isNonEmptyString(criterionId)) {
      throw new TypeError(
        `criteriaPreferenceOrder payload.criterionOrder[${index}] must be a non-empty criterion ID string.`,
      );
    }

    if (seenIds.has(criterionId)) {
      throw new Error(
        `criteriaPreferenceOrder payload.criterionOrder contains duplicate criterion ID "${criterionId}".`,
      );
    }

    seenIds.add(criterionId);
  }

  return criterionOrder;
};

export const validateCriteriaPreferenceOrderPayloadOrThrow = ({
  payload,
  decisionContext,
  mode,
}) => {
  if (mode !== "draft" && mode !== "submit") {
    throw new Error(
      `criteriaPreferenceOrder received unsupported save mode "${String(mode)}". Expected "draft" or "submit".`,
    );
  }

  const leafCriterionIds = getLeafCriterionIdsOrThrow({
    decisionContext,
  });

  const criterionOrder = assertCriteriaPreferenceOrderPayloadShapeOrThrow(
    payload,
  );

  const leafCriterionIdSet = new Set(leafCriterionIds);

  for (const criterionId of criterionOrder) {
    if (!leafCriterionIdSet.has(criterionId)) {
      throw new Error(
        `criteriaPreferenceOrder references unknown leaf criterion ID "${criterionId}".`,
      );
    }
  }

  if (mode === "draft") {
    return;
  }

  if (criterionOrder.length !== leafCriterionIds.length) {
    const submittedCriterionIds = new Set(criterionOrder);

    const missingCriterionIds = leafCriterionIds.filter(
      (criterionId) => !submittedCriterionIds.has(criterionId),
    );

    const missingDescription = missingCriterionIds.length > 0
      ? ` Missing criterion IDs: ${missingCriterionIds.join(", ")}.`
      : "";

    throw new Error(
      `criteriaPreferenceOrder submit mode requires all ${leafCriterionIds.length} current leaf criteria exactly once; received ${criterionOrder.length}.${missingDescription}`,
    );
  }

  const submittedCriterionIds = new Set(criterionOrder);

  const missingCriterionIds = leafCriterionIds.filter(
    (criterionId) => !submittedCriterionIds.has(criterionId),
  );

  if (missingCriterionIds.length > 0) {
    throw new Error(
      `criteriaPreferenceOrder submit mode is missing criterion IDs: ${missingCriterionIds.join(", ")}.`,
    );
  }
};