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

/** TOPSIS-Sort keeps category cards at a consistent size and scrolls their contents. */
export const topsisSortResultGridSx = Object.freeze({
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
  alignContent: "start",
  alignItems: "stretch",
  gap: 1,
  width: "100%",
  minWidth: 0,
  p: 0.2,
});

export const topsisSortCategoryCardSx = Object.freeze({
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
  height: { xs: 228, sm: 300, md: 320 },
});

export const topsisSortCategoryBodySx = Object.freeze({
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  overscrollBehavior: "contain",
  ...finishedIssueScrollbarSx,
});
