/** A single natural-height result list; Finished Issue owns the vertical scroll. */
export const sortingFinalResultSx = Object.freeze({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: 0,
  overflowX: "hidden",
  p: 0.2,
});

export const sortingFinalCategorySx = Object.freeze({
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(190px, 0.34fr) minmax(0, 1fr)" },
  columnGap: { xs: 0, md: 2 },
  rowGap: 0.55,
  minWidth: 0,
  py: { xs: 1, sm: 1.15 },
  px: { xs: 0.65, sm: 0.85 },
  "&:last-of-type": { borderBottom: 0 },
});

export const sortingFinalCategoryAlternativesSx = Object.freeze({
  position: "relative",
  listStyle: "none",
  minWidth: 0,
  m: 0,
  py: 0.15,
  pl: { xs: 1.15, md: 1.3 },
  "&::before": {
    content: '""',
    position: "absolute",
    left: { xs: "0.05rem", md: "0.05rem" },
    top: "0.45rem",
    bottom: "0.45rem",
    width: "1px",
    borderRadius: "999px",
    background: "linear-gradient(180deg, transparent 0%, currentColor 17%, currentColor 83%, transparent 100%)",
    color: "secondary.light",
    opacity: 0.52,
  },
});
