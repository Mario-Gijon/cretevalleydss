export const dashboardRootSx = {
  display: "grid",
  width: "100%",
  minWidth: 0,
  gap: { xs: 2.5, md: 3 },
};

export const sectionTitleSx = { mb: 1.25, fontWeight: 600 };

export const issueSummaryGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
  borderTop: "1px solid rgba(255,255,255,0.10)",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
};

export const summaryValueSx = {
  minWidth: 0,
  py: 1.25,
  px: { xs: 0, sm: 1.5 },
  borderBottom: { xs: "1px solid rgba(255,255,255,0.07)", sm: "none" },
  "&:nth-of-type(odd)": { borderRight: { sm: "1px solid rgba(255,255,255,0.08)", lg: "none" } },
  "@media (min-width:1200px)": {
    "&:not(:last-of-type)": { borderRight: "1px solid rgba(255,255,255,0.08)" },
    "&:nth-of-type(2n)": { borderRight: "1px solid rgba(255,255,255,0.08)" },
  },
};

export const rankingViewportSx = {
  width: "100%",
  minWidth: 0,
  maxHeight: { xs: 320, md: 420 },
  overflowY: "auto",
  overflowX: "hidden",
  borderTop: "1px solid rgba(255,255,255,0.10)",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  scrollbarWidth: "thin",
};

export const rankingHeaderSx = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "2.5rem minmax(0, 1fr) minmax(4.5rem, auto)",
  alignItems: "center",
  gap: 1,
  px: 1,
  py: 0.75,
  bgcolor: "background.paper",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
};

export const rankingRowSx = {
  display: "grid",
  gridTemplateColumns: "2.5rem minmax(0, 1fr) minmax(4.5rem, auto)",
  alignItems: "start",
  gap: 1,
  px: 1,
  py: 0.9,
  borderBottom: "1px solid rgba(255,255,255,0.055)",
  "&:last-child": { borderBottom: 0 },
};

export const firstRankingRowSx = {
  bgcolor: "rgba(63, 203, 207, 0.055)",
  "& [role=cell]:nth-of-type(2)": { fontWeight: 600 },
};

export const findingsGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))",
  gap: 1.25,
};

export const findingSx = {
  minWidth: 0,
  p: 1.25,
  borderLeft: "2px solid rgba(83, 198, 214, 0.42)",
  bgcolor: "rgba(255,255,255,0.025)",
};

// Legacy preview styles remain for reusable dashboard cards still covered by
// their own feature tests; the Summary view no longer imports them.
export const dashboardFirstRowSx = { display: "grid", width: "100%", minWidth: 0, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.55fr) minmax(340px, 0.9fr)" }, gap: { xs: 0.9, md: 1, xl: 1.2 }, alignItems: "stretch" };
export const dashboardSecondRowSx = { display: "grid", width: "100%", minWidth: 0, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 0.9, md: 1, xl: 1.2 }, alignItems: "stretch" };
export const dashboardItemSx = { minWidth: 0, display: "flex", "& > *": { width: "100%", height: "100%" } };
export const dashboardCardSx = () => ({ height: "100%", minWidth: 0, display: "flex", flexDirection: "column", p: { xs: 1.15, md: 1.35, xl: 1.5 }, borderRadius: 3, border: "1px solid rgba(85, 199, 216, 0.20)", bgcolor: "rgba(9, 19, 30, 0.91)", background: "linear-gradient(150deg, rgba(27, 111, 145, 0.18), rgba(9, 19, 30, 0.94) 46%)" });
export const dashboardCardHeaderSx = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.8, mb: 2 };
export const dashboardCardIconSx = { width: 32, height: 32, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "50%", color: "secondary.light", bgcolor: "rgba(63, 203, 207, 0.14)", border: "1px solid rgba(255,255,255,0.07)", mb: 0.5 };
export const dashboardCardTitleSx = {};
export const dashboardCardInnerSx = { minWidth: 0, flex: 1 };
export const dashboardCardBodySx = { minWidth: 0, flex: 1 };
export const dashboardCardFooterSx = { mt: 0.8, pt: 0.8, borderTop: "1px solid rgba(255,255,255,0.075)" };
export const dashboardCardActionSx = { width: "100%", minHeight: 36, px: 1.45, borderRadius: 1.25, textTransform: "none", justifyContent: "space-between", "& .MuiButton-endIcon": { ml: "auto" } };
export const dashboardInnerPanelSx = { minWidth: 0, p: { xs: 0.9, xl: 1.05 }, borderRadius: 2, border: "1px solid rgba(255,255,255,0.085)", bgcolor: "rgba(5, 13, 22, 0.34)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)" };
export const dashboardDescriptionSx = { color: "text.secondary", whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.55 };
export const dashboardResultsUpperGridSx = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "0.9fr 1.1fr", md: "1fr", lg: "0.9fr 1.1fr" }, gap: 0.75 };
export const dashboardChartSx = { height: 220, minHeight: 220, width: "100%" };
export const dashboardEvaluationViewportSx = { width: "100%", minWidth: 0, height: { xs: 250, xl: 285 }, overflow: "auto", p: 0.8, borderRadius: 1.6, border: "1px solid rgba(255,255,255,0.08)", bgcolor: "rgba(3, 10, 17, 0.30)" };
export const dashboardBoundedListSx = { minWidth: 0, maxHeight: { xs: 150, md: 180 }, overflowY: "auto", overflowX: "hidden", pr: 0.4, scrollbarWidth: "thin", scrollbarColor: "rgba(72,189,205,0.48) rgba(5,13,21,0.15)" };
