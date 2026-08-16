import { isPlainObject } from "../../../../../../utils/common/objects";
import { validateExpressionDomainEvaluation } from "../../../../../expressionDomains/validateExpressionDomainEvaluation";

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

const validateCollectiveCell = ({ value, criterion, cellId }) => {
  if (criterion.expressionDomain?.typeKey === "linguistic2Tuple") {
    try {
      validateExpressionDomainEvaluation({
        value,
        expressionDomain: criterion.expressionDomain,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Value is invalid.";
      throw new Error(`Collective payload cell '${cellId}' is invalid: ${message}`);
    }
  }

  if (!isCanonicalCollectiveValue(value)) {
    throw new Error(
      `Collective payload cell '${cellId}' must be a finite number or a non-empty array of finite numbers.`
    );
  }
};

export const resolveCollective = ({
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
    if (!Object.hasOwn(collectiveEvaluation, alternative.id)) {
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
      if (!Object.hasOwn(row, criterion.id)) {
        throw new Error("Collective alternative row is missing a criterion cell.");
      }

      validateCollectiveCell({
        value: row[criterion.id],
        criterion,
        cellId: `${alternative.id}.${criterion.id}`,
      });
    }
  }

  return collectiveEvaluation;
};
