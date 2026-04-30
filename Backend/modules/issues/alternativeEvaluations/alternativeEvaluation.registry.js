import { createBadRequestError } from "../../../utils/common/errors.js";

import { ALTERNATIVE_EVALUATION_OPERATIONS_BY_STRUCTURE } from "./alternativeEvaluation.structures.js";

export const getEvaluationStructureOperationsOrThrow = (
  evaluationStructure
) => {
  const operations =
    ALTERNATIVE_EVALUATION_OPERATIONS_BY_STRUCTURE[evaluationStructure];

  if (!operations) {
    throw createBadRequestError(
      `Unsupported evaluation structure: ${String(evaluationStructure)}`,
      {
        code: "UNSUPPORTED_EVALUATION_STRUCTURE",
        field: "evaluationStructure",
      }
    );
  }

  return operations;
};
