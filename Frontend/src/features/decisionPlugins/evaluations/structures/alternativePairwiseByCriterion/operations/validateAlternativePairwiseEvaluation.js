const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const buildEmptyPairwiseCell = () => ({
  value: "",
});

export const requireCanonicalPairwiseCell = ({ cell, field }) => {
  if (!isPlainObject(cell)) {
    throw new Error(`${field} must be a canonical pairwise cell object.`);
  }

  const keys = Object.keys(cell);

  if (keys.length !== 1 || !Object.prototype.hasOwnProperty.call(cell, "value")) {
    throw new Error(`${field} must contain exactly the key "value".`);
  }

  if (cell.value === null || cell.value === undefined) {
    throw new Error(`${field}.value is invalid.`);
  }

  return cell;
};

export const requireCanonicalPairwiseEvaluations = ({
  alternatives,
  evaluations,
}) => {
  if (!isPlainObject(evaluations)) {
    throw new Error("Pairwise evaluations must be an object.");
  }

  const alternativeIds = alternatives.map((alternative) => alternative.id);
  const rowKeys = Object.keys(evaluations);
  const unknownRows = rowKeys.filter((rowId) => !alternativeIds.includes(rowId));

  if (unknownRows.length > 0) {
    throw new Error("Pairwise evaluations contain unknown rows.");
  }

  for (const rowAlternative of alternatives) {
    if (!Object.prototype.hasOwnProperty.call(evaluations, rowAlternative.id)) {
      throw new Error(`Pairwise evaluations are missing row "${rowAlternative.id}".`);
    }

    const row = evaluations[rowAlternative.id];

    if (!isPlainObject(row)) {
      throw new Error(`Pairwise row "${rowAlternative.id}" must be an object.`);
    }

    const columnKeys = Object.keys(row);
    const allowedColumnIds = alternativeIds.filter(
      (alternativeId) => alternativeId !== rowAlternative.id
    );
    const unknownColumns = columnKeys.filter(
      (columnId) => !allowedColumnIds.includes(columnId)
    );

    if (unknownColumns.length > 0) {
      if (unknownColumns.includes(rowAlternative.id)) {
        throw new Error(
          `Pairwise row "${rowAlternative.id}" must not contain a diagonal cell.`
        );
      }

      throw new Error(`Pairwise row "${rowAlternative.id}" contains unknown columns.`);
    }

    for (const columnAlternative of alternatives) {
      if (columnAlternative.id === rowAlternative.id) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(row, columnAlternative.id)) {
        throw new Error(
          `Pairwise row "${rowAlternative.id}" is missing column "${columnAlternative.id}".`
        );
      }

      requireCanonicalPairwiseCell({
        cell: row[columnAlternative.id],
        field: `evaluations.${rowAlternative.id}.${columnAlternative.id}`,
      });
    }
  }

  return evaluations;
};
