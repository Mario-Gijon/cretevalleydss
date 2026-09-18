import {
  ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH,
  EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
} from "../../../shared/evaluationMatrixSizing.js";

export const pairwiseMatrixSx = { container: { width: "100%", minWidth: 0 } };

export const buildPairwiseMatrixSx = ({ theme, alternativeCount, buildSharedStyles }) => ({
  ...buildSharedStyles(theme),
  "& .MuiDataGrid-cell.pairwise-grid-cell, & .MuiDataGrid-cell.diagonal-cell": {
    px: 0,
  },
  minWidth: Math.max(
    500,
    alternativeCount * EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH
      + ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH
  ),
});
