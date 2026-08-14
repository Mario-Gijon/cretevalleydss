const isPlainObject = (value) => {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const invalidResult = (message) => ({
  error: message,
  criterionOrder: [],
  rankedCriteria: [],
  unrankedCriteria: [],
});

export const resolvePreferenceOrder = ({
  criteria,
  evaluation,
}) => {
  if (!isPlainObject(evaluation)) {
    return invalidResult("Evaluation payload is invalid.");
  }

  if (!Array.isArray(evaluation.criterionOrder)) {
    return invalidResult(
      "Evaluation criterionOrder must be an array."
    );
  }

  const criteriaById = new Map(
    criteria.map((criterion) => [
      criterion.id,
      criterion,
    ])
  );

  const seenCriterionIds = new Set();

  for (
    let index = 0;
    index < evaluation.criterionOrder.length;
    index += 1
  ) {
    const criterionId = evaluation.criterionOrder[index];

    if (
      typeof criterionId !== "string" ||
      criterionId.length === 0
    ) {
      return invalidResult(
        `Evaluation criterionOrder contains an invalid criterion ID at position ${
          index + 1
        }.`
      );
    }

    if (seenCriterionIds.has(criterionId)) {
      return invalidResult(
        `Evaluation criterionOrder contains the duplicate criterion ID "${criterionId}".`
      );
    }

    if (!criteriaById.has(criterionId)) {
      return invalidResult(
        `Evaluation criterionOrder references the unknown criterion ID "${criterionId}".`
      );
    }

    seenCriterionIds.add(criterionId);
  }

  const criterionOrder = evaluation.criterionOrder;

  const rankedCriteria = criterionOrder.map((criterionId) => {
    return criteriaById.get(criterionId);
  });

  const unrankedCriteria = criteria.filter((criterion) => {
    return !seenCriterionIds.has(criterion.id);
  });

  return {
    error: null,
    criterionOrder,
    rankedCriteria,
    unrankedCriteria,
  };
};