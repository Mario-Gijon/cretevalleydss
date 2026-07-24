import { isPlainObject } from "../../../../../../utils/common/objects";

const hasOwnKey = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const isCanonicalCollectiveValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return true;
  }

  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
};

export const resolveCollectiveAlternativeCriteriaMatrix = ({
  alternatives,
  criteria,
  collectiveEvaluation,
}) => {
  if (collectiveEvaluation === null) {
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
      throw new Error("Collective payload is missing an alternative row.");
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
        throw new Error("Collective alternative row is missing a criterion cell.");
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
