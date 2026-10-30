export const pairwiseMatrixSx = { container: { width: "100%", minWidth: 0 } };

export const buildPairwiseMatrixSx = ({ theme, buildSharedStyles }) => ({
  ...buildSharedStyles(theme),
  minWidth: 0,
  "& .MuiDataGrid-cell.pairwise-grid-cell, & .MuiDataGrid-cell.diagonal-cell": {
    px: 0,
  },
});
