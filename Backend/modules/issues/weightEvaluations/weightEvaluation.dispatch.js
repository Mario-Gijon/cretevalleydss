import { createBadRequestError } from "../../../utils/common/errors.js";

import { WEIGHTING_MODES } from "./weightEvaluation.constants.js";
import { manualWeightEvaluationHandlers } from "./weightEvaluation.manual.js";
import { bwmWeightEvaluationHandlers } from "./weightEvaluation.bwm.js";

export const WEIGHT_EVALUATION_HANDLERS = Object.freeze({
  [WEIGHTING_MODES.MANUAL]: manualWeightEvaluationHandlers,
  [WEIGHTING_MODES.CONSENSUS]: manualWeightEvaluationHandlers,
  [WEIGHTING_MODES.BWM]: bwmWeightEvaluationHandlers,
  [WEIGHTING_MODES.CONSENSUS_BWM]: bwmWeightEvaluationHandlers,
  [WEIGHTING_MODES.SIMULATED_CONSENSUS_BWM]: bwmWeightEvaluationHandlers,
});

export const getSupportedWeightingModes = () =>
  Object.keys(WEIGHT_EVALUATION_HANDLERS);

export const isSupportedWeightingMode = (weightingMode) =>
  typeof weightingMode === "string" &&
  Object.prototype.hasOwnProperty.call(
    WEIGHT_EVALUATION_HANDLERS,
    weightingMode
  );

export const getWeightEvaluationHandler = (weightingMode) => {
  if (isSupportedWeightingMode(weightingMode)) {
    return WEIGHT_EVALUATION_HANDLERS[weightingMode];
  }

  throw createBadRequestError(
    `Unsupported weighting mode: ${String(weightingMode)}`,
    {
      code: "UNSUPPORTED_WEIGHTING_MODE",
      field: "weightingMode",
      details: {
        supported: getSupportedWeightingModes(),
      },
    }
  );
};
