const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasOwnKey = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const requireCanonicalCell = (cell) => {
  if (!isPlainObject(cell)) {
    throw new Error("Matrix cell must be an object.");
  }

  const keys = Object.keys(cell);

  if (keys.length !== 1 || !hasOwnKey(cell, "value")) {
    throw new Error("Matrix cell must contain exactly the key 'value'.");
  }

  if (cell.value === null || cell.value === undefined) {
    throw new Error("Matrix cell value is invalid.");
  }

  return cell;
};

export const requireCanonicalAlternativeCriteriaMatrix = ({
  alternatives,
  criteria,
  evaluations,
}) => {
  if (!isPlainObject(evaluations)) {
    throw new Error("Evaluation payload is invalid.");
  }

  const alternativeIds = alternatives.map((alternative) => alternative.id);
  const criterionIds = criteria.map((criterion) => criterion.id);
  const unknownAlternativeIds = Object.keys(evaluations).filter(
    (alternativeId) => !alternativeIds.includes(alternativeId)
  );

  if (unknownAlternativeIds.length > 0) {
    throw new Error("Evaluation payload contains unknown alternative rows.");
  }

  for (const alternative of alternatives) {
    if (!hasOwnKey(evaluations, alternative.id)) {
      throw new Error("Evaluation payload is missing an alternative row.");
    }

    const row = evaluations[alternative.id];

    if (!isPlainObject(row)) {
      throw new Error("Alternative criteria row must be an object.");
    }

    const unknownCriterionIds = Object.keys(row).filter(
      (criterionId) => !criterionIds.includes(criterionId)
    );

    if (unknownCriterionIds.length > 0) {
      throw new Error("Alternative criteria row contains unknown criterion cells.");
    }

    for (const criterion of criteria) {
      if (!hasOwnKey(row, criterion.id)) {
        throw new Error("Alternative criteria row is missing a criterion cell.");
      }

      requireCanonicalCell(row[criterion.id]);
    }
  }

  return evaluations;
};

export const updateAlternativeCriteriaMatrixCell = ({
  alternatives,
  criteria,
  evaluations,
  alternativeId,
  criterionId,
  nextValue,
}) => {
  const matrix = requireCanonicalAlternativeCriteriaMatrix({
    alternatives,
    criteria,
    evaluations,
  });

  if (!alternatives.some((alternative) => alternative.id === alternativeId)) {
    throw new Error("Unknown alternative row.");
  }

  if (!criteria.some((criterion) => criterion.id === criterionId)) {
    throw new Error("Unknown criterion cell.");
  }

  return {
    ...matrix,
    [alternativeId]: {
      ...matrix[alternativeId],
      [criterionId]: {
        value: nextValue,
      },
    },
  };
};
