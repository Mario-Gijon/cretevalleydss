export const buildAlternativeCriteriaMatrixRows = ({
  alternatives,
  criteria,
  evaluation,
}) =>
  alternatives.map((alternative) => {
    const row = {
      id: alternative.id,
      alternativeLabel: alternative.name,
    };

    criteria.forEach((criterion) => {
      row[criterion.id] =
        evaluation?.[alternative.id]?.[criterion.id]?.value;
    });

    return row;
  });
