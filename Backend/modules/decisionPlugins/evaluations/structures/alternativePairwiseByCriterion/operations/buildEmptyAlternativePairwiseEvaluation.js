import { buildEmptyAlternativePairwiseCell } from "./normalizeAlternativePairwiseEvaluation.js";

const buildEmptyMatrix = ({ alternatives }) =>
  Object.fromEntries(
    alternatives.map((rowAlternative) => [
      rowAlternative.id,
      Object.fromEntries(
        alternatives
          .filter(
            (columnAlternative) =>
              columnAlternative.id !== rowAlternative.id
          )
          .map((columnAlternative) => [
            columnAlternative.id,
            buildEmptyAlternativePairwiseCell(),
          ])
      ),
    ])
  );

export const buildEmptyAlternativePairwiseEvaluation = ({
  criterionIds,
  alternatives,
}) =>
  Object.fromEntries(
    criterionIds.map((criterionId) => [
      criterionId,
      buildEmptyMatrix({ alternatives }),
    ])
  );
