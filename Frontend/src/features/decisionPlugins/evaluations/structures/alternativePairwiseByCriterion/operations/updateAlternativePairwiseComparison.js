import { reflectExpressionDomainValue } from "../../../../../expressionDomains";
import {
  buildEmptyPairwiseCell,
  requireCanonicalPairwiseEvaluations,
} from "./validateAlternativePairwiseEvaluation";

export const updatePairwiseEvaluations = ({
  alternatives,
  evaluations,
  rowAlternativeId,
  columnAlternativeId,
  nextValue,
  expressionDomain,
}) => {
  const canonicalEvaluations = requireCanonicalPairwiseEvaluations({
    alternatives,
    evaluations,
  });
  const rowIndex = alternatives.findIndex(
    (alternative) => alternative.id === rowAlternativeId
  );
  const columnIndex = alternatives.findIndex(
    (alternative) => alternative.id === columnAlternativeId
  );

  if (rowIndex < 0 || columnIndex < 0) {
    throw new Error("Pairwise update references an unknown alternative.");
  }

  if (rowIndex === columnIndex) {
    throw new Error("Pairwise updates cannot target diagonal cells.");
  }

  if (rowIndex > columnIndex) {
    throw new Error("Pairwise updates can only target upper-triangle cells.");
  }

  const nextEvaluations = structuredClone(canonicalEvaluations);

  if (nextValue === "") {
    nextEvaluations[rowAlternativeId][columnAlternativeId] =
      buildEmptyPairwiseCell();
    nextEvaluations[columnAlternativeId][rowAlternativeId] =
      buildEmptyPairwiseCell();
    return nextEvaluations;
  }

  nextEvaluations[rowAlternativeId][columnAlternativeId] = {
    value: nextValue,
  };

  try {
    nextEvaluations[columnAlternativeId][rowAlternativeId] = {
      value: reflectExpressionDomainValue({
        value: nextValue,
        expressionDomain,
      }),
    };
  } catch {
    nextEvaluations[columnAlternativeId][rowAlternativeId] =
      buildEmptyPairwiseCell();
  }

  return nextEvaluations;
};
