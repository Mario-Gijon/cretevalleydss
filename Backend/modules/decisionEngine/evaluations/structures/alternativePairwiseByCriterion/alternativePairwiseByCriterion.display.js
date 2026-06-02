import { isPlainObject } from "../../../../../utils/common/objects.js";

const isFilledValue = (value) =>
  !(value === null || value === undefined || value === "");

export const buildProgressMeta = ({
  storedEvaluation,
  alternativeNames,
  criterionNames,
}) => {
  const comparisonsByCriterion =
    isPlainObject(storedEvaluation?.payload?.comparisonsByCriterion)
      ? storedEvaluation.payload.comparisonsByCriterion
      : {};

  const totalItems = Object.values(comparisonsByCriterion).reduce(
    (total, criterionComparisons) =>
      total +
      (isPlainObject(criterionComparisons)
        ? Object.keys(criterionComparisons).length
        : 0),
    0
  );

  const filledItems = Object.values(comparisonsByCriterion).reduce(
    (total, criterionComparisons) => {
      if (!isPlainObject(criterionComparisons)) {
        return total;
      }

      return (
        total +
        Object.values(criterionComparisons).filter((cell) =>
          isFilledValue(cell?.value)
        ).length
      );
    },
    0
  );

  const expectedItems =
    alternativeNames.length > 0 && criterionNames.length > 0
      ? alternativeNames.length *
        criterionNames.length *
        Math.max(alternativeNames.length - 1, 0)
      : 0;

  return {
    progress: {
      expectedItems,
      totalItems,
      filledItems,
    },
  };
};
