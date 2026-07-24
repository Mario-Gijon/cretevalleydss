export const pairwiseAlternativesGridSx = {
  container: {
    width: "100%",
    minWidth: 0,
    overflowX: "auto",
  },
  cell: {
    width: "100%",
    minWidth: 0,
    height: "100%",
  },
  value: {
    minWidth: 0,
    flex: 1,
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    "& .MuiFormControl-root": { width: "100%" },
  },
  chip: {
    height: 20,
    flexShrink: 0,
    pointerEvents: "none",
  },
};

export const buildPairwiseAlternativesDataGridSx = ({
  theme,
  alternativeCount,
  buildSharedStyles,
}) => ({
  ...buildSharedStyles(theme),
  minWidth: Math.max(500, alternativeCount * 150 + 150),
});
