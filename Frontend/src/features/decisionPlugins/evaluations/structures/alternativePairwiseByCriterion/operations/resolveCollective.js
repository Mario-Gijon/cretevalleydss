import { isPlainObject } from "../../../../../../utils/common/objects";

export const resolveCollective = ({
  alternatives,
  criteria,
  collectiveEvaluation,
}) => {
  if (collectiveEvaluation === null || collectiveEvaluation === undefined) {
    return null;
  }

  if (!isPlainObject(collectiveEvaluation)) {
    throw new Error("Collective pairwise payload must be an object.");
  }

  const alternativeIds = alternatives.map((alternative) => alternative.id);
  const criterionIds = criteria.map((criterion) => criterion.id);
  const unknownCriterionIds = Object.keys(collectiveEvaluation).filter(
    (criterionId) => !criterionIds.includes(criterionId)
  );

  if (unknownCriterionIds.length > 0) {
    throw new Error("Collective pairwise payload contains unknown criteria.");
  }

  for (const criterionId of criterionIds) {
    if (!Object.hasOwn(collectiveEvaluation, criterionId)) {
      throw new Error("Collective pairwise payload is missing a criterion.");
    }

    const matrix = collectiveEvaluation[criterionId];

    if (!isPlainObject(matrix)) {
      throw new Error("Collective pairwise criterion must be an object.");
    }

    const unknownRowIds = Object.keys(matrix).filter(
      (rowAlternativeId) => !alternativeIds.includes(rowAlternativeId)
    );

    if (unknownRowIds.length > 0) {
      throw new Error(
        "Collective pairwise payload contains unknown alternative rows."
      );
    }

    for (const rowAlternativeId of alternativeIds) {
      if (!Object.hasOwn(matrix, rowAlternativeId)) {
        throw new Error(
          "Collective pairwise payload is missing an alternative row."
        );
      }

      const row = matrix[rowAlternativeId];

      if (!isPlainObject(row)) {
        throw new Error("Collective pairwise payload has an invalid row.");
      }

      const expectedColumnIds = alternativeIds.filter(
        (columnAlternativeId) => columnAlternativeId !== rowAlternativeId
      );
      const columnIds = Object.keys(row);

      if (
        columnIds.length !== expectedColumnIds.length ||
        expectedColumnIds.some(
          (columnAlternativeId) => !Object.hasOwn(row, columnAlternativeId)
        )
      ) {
        throw new Error("Collective pairwise payload has an invalid matrix.");
      }

      for (const columnAlternativeId of expectedColumnIds) {
        const value = row[columnAlternativeId];

        if (
          value === undefined ||
          value === null ||
          (isPlainObject(value) && Object.hasOwn(value, "value"))
        ) {
          throw new Error(
            "Collective pairwise payload contains an invalid direct value."
          );
        }
      }
    }
  }

  return collectiveEvaluation;
};
