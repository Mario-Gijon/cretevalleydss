const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasOwnKey = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const isCanonicalCollectiveValue = (value) => {
  if (isFiniteNumber(value)) {
    return true;
  }

  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isFiniteNumber(item))
  );
};

export const resolveCollectiveAlternativeCriteriaMatrix = ({
  alternatives,
  criteria,
  collectiveEvaluation,
}) => {
  if (collectiveEvaluation === null || collectiveEvaluation === undefined) {
    return null;
  }

  if (!isPlainObject(collectiveEvaluation)) {
    throw new Error("Collective payload must be an object.");
  }

  const alternativeIds = alternatives.map((alternative) => alternative.id);
  const criterionIds = criteria.map((criterion) => criterion.id);
  const unknownAlternativeIds = Object.keys(collectiveEvaluation).filter(
    (alternativeId) => !alternativeIds.includes(alternativeId)
  );

  if (unknownAlternativeIds.length > 0) {
    throw new Error("Collective payload contains unknown alternative rows.");
  }

  for (const alternative of alternatives) {
    if (!hasOwnKey(collectiveEvaluation, alternative.id)) {
      continue;
    }

    const row = collectiveEvaluation[alternative.id];

    if (!isPlainObject(row)) {
      throw new Error("Collective alternative row must be an object.");
    }

    const unknownCriterionIds = Object.keys(row).filter(
      (criterionId) => !criterionIds.includes(criterionId)
    );

    if (unknownCriterionIds.length > 0) {
      throw new Error("Collective alternative row contains unknown criterion cells.");
    }

    for (const criterion of criteria) {
      if (!hasOwnKey(row, criterion.id)) {
        continue;
      }

      if (!isCanonicalCollectiveValue(row[criterion.id])) {
        throw new Error(
          `Collective payload cell '${alternative.id}.${criterion.id}' must be a finite number or a non-empty array of finite numbers.`
        );
      }
    }
  }

  return collectiveEvaluation;
};
