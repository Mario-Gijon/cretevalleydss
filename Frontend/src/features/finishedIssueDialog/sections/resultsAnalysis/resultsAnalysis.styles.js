const localScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(72,189,205,0.48) rgba(5,13,21,0.15)",
  "&::-webkit-scrollbar": { width: 7, height: 7 },
  "&::-webkit-scrollbar-track": { bgcolor: "rgba(5,13,21,0.15)", borderRadius: 99 },
  "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(72,189,205,0.38)", borderRadius: 99 },
};

export const resultsAnalysisRootSx = { width: "100%" };

export const executionSelectionToolbarSx = {
  display: "flex",
  flexDirection: { xs: "column", md: "row" },
  alignItems: { xs: "stretch", md: "center" },
  gap: 1,
  p: 1,
  borderRadius: 2.5,
  border: "1px solid rgba(83,198,214,0.14)",
  bgcolor: "rgba(8,18,29,0.84)",
};

export const resultsPanelSx = {
  minWidth: 0,
  p: { xs: 1.2, md: 1.5 },
  borderRadius: 3,
  border: "1px solid rgba(83,198,214,0.18)",
  bgcolor: "rgba(8,18,29,0.92)",
  background: "linear-gradient(150deg, rgba(25,105,140,0.12), rgba(8,18,29,0.97) 50%)",
};

export const scoreOverviewPanelSx = {
  ...resultsPanelSx,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

export const singleOutcomeGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "minmax(360px, 0.95fr) minmax(0, 1.25fr)" },
  gap: 1.2,
  alignItems: "stretch",
};

export const rankingListViewportSx = (compact) => ({
  ...localScrollbarSx,
  maxHeight: compact ? 430 : { xs: 520, xl: 380 },
  overflowY: "auto",
  overflowX: "hidden",
  pr: 0.4,
});

export const rankingRowSx = (winner, compact) => ({
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: compact ? 0.8 : 1.1,
  px: compact ? 0.8 : 1.1,
  py: compact ? 0.75 : 1,
  borderRadius: 2,
  border: "1px solid",
  borderColor: winner ? "rgba(111,220,104,0.33)" : "rgba(255,255,255,0.07)",
  bgcolor: winner ? "rgba(111,220,104,0.075)" : "rgba(3,10,17,0.28)",
});

export const scoreChartViewportSx = {
  ...localScrollbarSx,
  mt: 1,
  width: "100%",
  overflowX: "auto",
  overflowY: "hidden",
};

export const scoreChartContainerSx = (minWidth, chartHeight) => ({
  minWidth,
  width: "100%",
  height: chartHeight,
  minHeight: chartHeight,
  maxHeight: chartHeight,
  flex: "0 0 auto",
});

export const comparisonOutcomeGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.35fr) minmax(340px, 0.65fr)" },
  gap: 1.2,
  alignItems: "start",
  "& > :first-of-type": { gridColumn: { lg: "1 / -1" } },
};

export const comparisonRankingsGridSx = (count) => ({
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", xl: `repeat(${Math.min(count, 3)}, minmax(0, 1fr))` },
  gap: 1,
  mt: 1.2,
});

export const executionRankingCardSx = (color) => ({
  minWidth: 0,
  p: 1,
  borderRadius: 2,
  border: `1px solid ${color}55`,
  bgcolor: "rgba(3,10,17,0.30)",
});

export const movementChartViewportSx = { ...localScrollbarSx, mt: 1, maxHeight: 610, overflow: "auto" };
export const correlationMatrixViewportSx = { ...localScrollbarSx, overflowX: "auto", overflowY: "hidden" };

export const developmentNoticeSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  p: { xs: 1.2, md: 1.5 },
  borderRadius: 3,
  border: "1px solid rgba(83,198,214,0.18)",
  bgcolor: "rgba(8,18,29,0.92)",
  background: "linear-gradient(90deg, rgba(24,147,165,0.15), rgba(8,18,29,0.97) 58%)",
};
