import { WEIGHTING_MODES } from "./weightEvaluation.constants.js";
import { manualWeightEvaluations } from "./manual/index.js";
import { bwmWeightEvaluations } from "./bwm/index.js";

export const WEIGHT_EVALUATION_OPERATIONS_BY_MODE = Object.freeze({
  [WEIGHTING_MODES.MANUAL]: manualWeightEvaluations,
  [WEIGHTING_MODES.CONSENSUS]: manualWeightEvaluations,
  [WEIGHTING_MODES.BWM]: bwmWeightEvaluations,
  [WEIGHTING_MODES.CONSENSUS_BWM]: bwmWeightEvaluations,
  [WEIGHTING_MODES.SIMULATED_CONSENSUS_BWM]: bwmWeightEvaluations,
});
