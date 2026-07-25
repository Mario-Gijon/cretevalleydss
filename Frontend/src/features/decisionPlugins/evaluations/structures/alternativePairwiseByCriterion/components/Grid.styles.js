export const gridSx = {
  container: {
    width: "100%",
    minWidth: 0,
    overflowX: "auto",
  },
};

export const buildGridSx = ({
  theme,
  alternativeCount,
  buildSharedStyles,
}) => ({
  ...buildSharedStyles(theme),
  minWidth: Math.max(500, alternativeCount * 150 + 150),
});
