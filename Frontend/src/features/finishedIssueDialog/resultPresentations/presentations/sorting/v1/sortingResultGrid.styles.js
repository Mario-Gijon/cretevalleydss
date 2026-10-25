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

/** TOPSIS-Sort cards follow their content and cap long alternative lists. */
export const topsisSortResultGridSx = Object.freeze({
  columnCount: { xs: 1, md: 2 },
  columnGap: 1,
  columnFill: "balance",
  width: "100%",
  minWidth: 0,
  p: 0.2,
  "& > [role='listitem']": {
    display: "inline-block",
    verticalAlign: "top",
    width: "100%",
    boxSizing: "border-box",
    breakInside: "avoid",
    mb: 1,
  },
});

export const topsisSortCategoryCardSx = Object.freeze({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

export const topsisSortCategoryBodySx = Object.freeze({
  minHeight: 0,
  maxHeight: { xs: 220, md: 280 },
  overflowY: "auto",
  overflowX: "hidden",
  overscrollBehavior: "contain",
  ...finishedIssueScrollbarSx,
});
