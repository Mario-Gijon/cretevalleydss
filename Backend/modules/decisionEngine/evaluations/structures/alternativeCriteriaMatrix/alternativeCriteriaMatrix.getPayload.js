import { isPlainObject } from "../../../../../utils/common/objects.js";
import {
  buildExpectedCellMetadata,
  resolveAlternativesAndCriteria,
} from "./alternativeCriteriaMatrix.context.js";
import {
  buildEmptyCell,
  validateCellValueByDomainOrThrow,
} from "./alternativeCriteriaMatrix.payload.js";

export const buildGetPayload = async ({
  storedEvaluation,
  issue,
  alternatives,
  criteria,
}) => {
  const {
    alternativeNames,
    criteria: resolvedCriteria,
  } = await resolveAlternativesAndCriteria({
    issue,
    alternatives,
    criteria,
  });
  const { expectedKeys: expectedCellKeys, expressionDomainByCellKey } =
    buildExpectedCellMetadata({
      alternativeNames,
      criteria: resolvedCriteria,
    });

  const storedCells = isPlainObject(storedEvaluation?.payload?.cells)
    ? storedEvaluation.payload.cells
    : {};

  const cells = expectedCellKeys.reduce((accumulator, cellKey) => {
    const storedCell = storedCells[cellKey];
    const expectedExpressionDomain = expressionDomainByCellKey.get(cellKey);

    if (!isPlainObject(storedCell)) {
      accumulator[cellKey] = buildEmptyCell(expectedExpressionDomain);
      return accumulator;
    }

    accumulator[cellKey] = {
      value:
        storedCell.value === "" ||
        storedCell.value === null ||
        storedCell.value === undefined
          ? ""
          : validateCellValueByDomainOrThrow({
              value: storedCell.value,
              expressionDomain: expectedExpressionDomain,
              field: "payload.cells",
            }),
      expressionDomain: expectedExpressionDomain,
    };

    return accumulator;
  }, {});

  return {
    payload: { cells },
    context: {
      alternativeNames,
      criteria: resolvedCriteria,
    },
  };
};
