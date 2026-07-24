import { requireCanonicalAlternativeCriteriaMatrix } from "./validateAlternativeCriteriaMatrix.js";

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
