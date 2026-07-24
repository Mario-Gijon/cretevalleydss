import { buildEmptyAlternativeCriteriaMatrixCell } from "./normalizeAlternativeCriteriaMatrix.js";

export const buildEmptyAlternativeCriteriaMatrix = ({
  alternatives,
  criteria,
}) =>
  Object.fromEntries(
    alternatives.map((alternative) => [
      alternative.id,
      Object.fromEntries(
        criteria.map((criterion) => [
          criterion.id,
          buildEmptyAlternativeCriteriaMatrixCell(),
        ])
      ),
    ])
  );
