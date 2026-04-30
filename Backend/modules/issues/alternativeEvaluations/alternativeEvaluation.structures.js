import { EVALUATION_STRUCTURES } from "./alternativeEvaluation.constants.js";

import { directAlternativeEvaluations } from "./direct/index.js";
import { pairwiseAlternativeEvaluations } from "./pairwiseAlternatives/index.js";

export const ALTERNATIVE_EVALUATION_OPERATIONS_BY_STRUCTURE = Object.freeze({
  [EVALUATION_STRUCTURES.DIRECT]: directAlternativeEvaluations,
  [EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES]:
    pairwiseAlternativeEvaluations,
});
