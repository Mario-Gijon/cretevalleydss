import { isPlainObject } from "../../../../../utils/common/objects.js";

const isFilledValue = (value) =>
  !(value === null || value === undefined || value === "");

export const buildProgressMeta = ({ storedEvaluation, alternativeNames, criteria }) => {
  const storedCells =
    isPlainObject(storedEvaluation?.payload?.cells)
      ? storedEvaluation.payload.cells
      : {};

  const totalItems = Object.keys(storedCells).length;
  const filledItems = Object.values(storedCells).filter((cell) =>
    isFilledValue(cell?.value)
  ).length;

  const expectedItems =
    alternativeNames.length > 0 && criteria.length > 0
      ? alternativeNames.length * criteria.length
      : 0;

  return {
    progress: {
      expectedItems,
      totalItems,
      filledItems,
    },
  };
};
