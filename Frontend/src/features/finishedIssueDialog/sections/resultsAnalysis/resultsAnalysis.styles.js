export const finishedIssueScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(72,189,205,0.48) rgba(5,13,21,0.15)",
  "&::-webkit-scrollbar": { width: 7, height: 7 },
  "&::-webkit-scrollbar-track": { bgcolor: "rgba(5,13,21,0.15)", borderRadius: 99 },
  "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(72,189,205,0.38)", borderRadius: 99 },
};

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
  maxWidth: "100%",
};

export const singleOutcomeGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "minmax(360px, 0.95fr) minmax(0, 1.25fr)" },
  gap: 1.2,
  alignItems: "stretch",
};

export const rankingListViewportSx = (compact) => ({
  ...finishedIssueScrollbarSx,
  maxHeight: compact ? 430 : { xs: 520, xl: 380 },
  overflowY: "auto",
  overflowX: "hidden",
  pr: 0.4,
});

export const rankingRowSx = (winner, compact) => ({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: {
    xs: `${compact ? 34 : 42}px minmax(0, 1fr) minmax(120px, 48%)`,
    sm: `${compact ? 34 : 42}px minmax(0, 1fr) ${compact ? 220 : 300}px`,
  },
  alignItems: "center",
  gap: compact ? 0.8 : 1.1,
  px: compact ? 0.8 : 1.1,
  py: compact ? 0.75 : 1,
  borderRadius: 2,
  border: "1px solid",
  borderColor: winner ? "rgba(111,220,104,0.33)" : "rgba(255,255,255,0.07)",
  bgcolor: winner ? "rgba(111,220,104,0.075)" : "rgba(3,10,17,0.28)",
});

export const rankingScoreTrackSx = (compact) => ({
  mt: 0.65,
  width: "100%",
  maxWidth: compact ? 170 : "none",
  height: 5,
  borderRadius: 99,
  bgcolor: "rgba(255,255,255,0.055)",
  overflow: "hidden",
});

export const scoreChartViewportSx = {
  ...finishedIssueScrollbarSx,
  mt: 1,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
};

export const scoreChartContainerSx = (minWidth, chartHeight) => ({
  minWidth,
  width: "100%",
  maxWidth: "none",
  height: chartHeight,
  minHeight: chartHeight,
  maxHeight: chartHeight,
  flex: "0 0 auto",
});

export const comparisonOutcomeGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.15fr) minmax(0, 0.85fr)" },
  gap: 1.2,
  alignItems: "stretch",
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

export const comparisonDetailPanelSx = { ...resultsPanelSx, height: "100%", display: "flex", flexDirection: "column" };
export const movementChartViewportSx = { ...finishedIssueScrollbarSx, mt: 1, width: "100%", minWidth: 0, maxHeight: 610, overflow: "auto" };
export const correlationMatrixViewportSx = { ...finishedIssueScrollbarSx, mt: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden" };
export const correlationMatrixSx = (executionCount) => ({
  minWidth: Math.max(440, 150 + executionCount * 110),
  width: "100%",
  display: "grid",
  gridTemplateColumns: `150px repeat(${executionCount}, minmax(110px, 1fr))`,
  gap: 0.5,
});

export const correlationCellSx = (value) => {
  if (typeof value !== "number") {
    return {
      borderColor: "rgba(255,255,255,0.15)",
      bgcolor: "rgba(255,255,255,0.012)",
      color: "text.secondary",
    };
  }
  if (value >= 0.75) {
    return {
      borderColor: "rgba(111,220,104,0.72)",
      bgcolor: "rgba(111,220,104,0.055)",
      color: "success.light",
    };
  }
  if (value >= 0.25) {
    return {
      borderColor: "rgba(39,213,228,0.62)",
      bgcolor: "rgba(39,213,228,0.035)",
      color: "secondary.light",
    };
  }
  if (value > -0.25) {
    return {
      borderColor: "rgba(255,255,255,0.24)",
      bgcolor: "rgba(255,255,255,0.018)",
      color: "text.primary",
    };
  }
  return {
    borderColor: "rgba(169,96,232,0.70)",
    bgcolor: "rgba(169,96,232,0.05)",
    color: "#d5adff",
  };
};

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
