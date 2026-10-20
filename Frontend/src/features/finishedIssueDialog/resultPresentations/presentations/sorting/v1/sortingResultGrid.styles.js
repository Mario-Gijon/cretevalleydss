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
