import DirectEvaluationMatrix from "./DirectEvaluationMatrix.jsx";

export {
  buildClearedDirectEvaluations,
  buildDirectEvaluationsMatrix,
  buildDirectSavePayload,
  buildDirectSubmitPayload,
} from "./directEvaluation.mapper.js";

export {
  extractDirectCollectiveEvaluations,
  extractDirectDraftEvaluations,
} from "./directEvaluation.response.js";

export const directEvaluationStructure = {
  label: "Direct evaluation",
  Dialog: null,
  Matrix: DirectEvaluationMatrix,
};
