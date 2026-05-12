import PairwiseAlternativeMatrix from "./PairwiseAlternativeMatrix.jsx";

export {
  buildClearedPairwiseEvaluations,
  buildDiagonalPairwiseCell,
  buildEmptyPairwiseCell,
  buildPairwiseEvaluationsMatrix,
  buildPairwiseSavePayload,
  buildPairwiseSubmitPayload,
  getFirstDomainFromPairwiseMatrix,
} from "./pairwiseAlternatives.mapper.js";

export {
  extractPairwiseCollectiveEvaluations,
  extractPairwiseDraftEvaluations,
} from "./pairwiseAlternatives.response.js";

export const pairwiseAlternativesEvaluationStructure = {
  label: "Pairwise alternatives evaluation",
  Dialog: null,
  Matrix: PairwiseAlternativeMatrix,
};
