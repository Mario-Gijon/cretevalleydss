const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const resolveCollectiveAlternativePairwiseMatrix = ({
  collectiveEvaluation,
  criterionId,
  alternatives,
}) => {
  if (collectiveEvaluation === null || collectiveEvaluation === undefined) {
    return null;
  }

  if (!isPlainObject(collectiveEvaluation)) {
    throw new Error("Collective pairwise payload must be an object.");
  }

  const matrix = collectiveEvaluation[criterionId];

  if (!isPlainObject(matrix)) {
    throw new Error("Collective pairwise payload is missing the selected criterion.");
  }

  const alternativeIds = alternatives.map((alternative) => alternative.id);

  if (Object.keys(matrix).some((rowId) => !alternativeIds.includes(rowId))) {
    throw new Error("Collective pairwise payload contains unknown alternatives.");
  }

  alternativeIds.forEach((rowId) => {
    const row = matrix[rowId];

    if (!isPlainObject(row)) {
      throw new Error("Collective pairwise payload has an invalid row.");
    }

    const expectedColumns = alternativeIds.filter(
      (columnId) => columnId !== rowId
    );

    if (
      Object.keys(row).length !== expectedColumns.length ||
      expectedColumns.some(
        (columnId) => !Object.prototype.hasOwnProperty.call(row, columnId)
      )
    ) {
      throw new Error("Collective pairwise payload has an invalid matrix.");
    }
  });

  return matrix;
};
