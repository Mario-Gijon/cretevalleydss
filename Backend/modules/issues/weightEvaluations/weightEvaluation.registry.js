import { createBadRequestError } from "../../../utils/common/errors.js";

import { WEIGHT_EVALUATION_OPERATIONS_BY_MODE } from "./weightEvaluation.structures.js";

export const getWeightingModeOperationsOrThrow = (weightingMode) => {
  const operations = WEIGHT_EVALUATION_OPERATIONS_BY_MODE[weightingMode];

  if (!operations) {
    throw createBadRequestError(
      `Unsupported weighting mode: ${String(weightingMode)}`,
      {
        code: "UNSUPPORTED_WEIGHTING_MODE",
        field: "weightingMode",
      }
    );
  }

  return operations;
};
