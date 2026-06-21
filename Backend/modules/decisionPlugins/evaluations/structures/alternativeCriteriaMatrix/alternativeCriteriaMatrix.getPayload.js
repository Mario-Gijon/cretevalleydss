import { isPlainObject } from "../../../../../utils/common/objects.js";
import { resolveAlternativesAndCriteria } from "./alternativeCriteriaMatrix.context.js";
import {
  buildEmptyCell,
  validateCellValueByDomainOrThrow,
} from "./alternativeCriteriaMatrix.payload.js";

export const buildGetPayload = async ({
  payload,
  evaluationContext,
}) => {
  const {
    alternatives,
    criteria,
  } = await resolveAlternativesAndCriteria({
    evaluationContext,
  });

  const matrixPayload = isPlainObject(payload) ? payload : {};
  const normalizedPayload = {};

  for (const alternative of alternatives) {
    const storedAlternativeRow = isPlainObject(matrixPayload[alternative.id])
      ? matrixPayload[alternative.id]
      : {};

    normalizedPayload[alternative.id] = {};

    for (const criterion of criteria) {
      const storedCell = storedAlternativeRow[criterion.id];

      if (!isPlainObject(storedCell)) {
        normalizedPayload[alternative.id][criterion.id] = buildEmptyCell(
          criterion.expressionDomain
        );
        continue;
      }

      normalizedPayload[alternative.id][criterion.id] = {
        value:
          storedCell.value === "" ||
          storedCell.value === null ||
          storedCell.value === undefined
            ? ""
            : validateCellValueByDomainOrThrow({
                value: storedCell.value,
                expressionDomain: criterion.expressionDomain,
                field: "payload",
              }),
        expressionDomain: criterion.expressionDomain,
      };
    }
  }

  return {
    payload: normalizedPayload,
    context: {
      alternatives,
      criteria,
    },
  };
};
