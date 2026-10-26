import { finishedIssueScrollbarSx } from "../../../../shared/styles/finishedIssueScrollbar.styles.js";

export const sortingResultGridSx = Object.freeze({
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
  alignContent: "start",
  gap: 1,
  width: "100%",
  minWidth: 0,
  maxHeight: { xs: 340, md: 440 },
  overflowY: "auto",
  overflowX: "hidden",
  p: 0.2,
  ...finishedIssueScrollbarSx,
});

/** TOPSIS-Sort categories share one scrollable, continuous classification list. */
export const topsisSortResultGridSx = Object.freeze({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: 0,
  maxHeight: { xs: 340, md: 440 },
  overflowY: "auto",
  overflowX: "hidden",
  overscrollBehavior: "contain",
  p: 0.2,
  ...finishedIssueScrollbarSx,
});

export const topsisSortCategorySx = Object.freeze({
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(190px, 0.34fr) minmax(0, 1fr)" },
  columnGap: { xs: 0, md: 2 },
  rowGap: 0.55,
  minWidth: 0,
  py: { xs: 1, sm: 1.15 },
  px: { xs: 0.65, sm: 0.85 },
  "&:last-of-type": { borderBottom: 0 },
});

export const topsisSortCategoryGroupSx = Object.freeze({
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
