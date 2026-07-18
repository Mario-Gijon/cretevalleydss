export const dashboardRootSx = {
  display: "grid",
  width: "100%",
  minWidth: 0,
  gap: { xs: 1.5, md: 1.75, xl: 2 },
};

export const dashboardKpiStripSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1.5fr) repeat(2, minmax(180px, 0.75fr))" },
  border: "1px solid rgba(100, 211, 219, 0.18)",
  borderRadius: 3,
  overflow: "hidden",
  bgcolor: "rgba(9, 20, 31, 0.88)",
  background: "linear-gradient(110deg, rgba(22, 93, 124, 0.20), rgba(9, 22, 34, 0.92) 58%)",
  boxShadow: "0 14px 34px rgba(0, 0, 0, 0.16)",
};

export const dashboardKpiItemSx = ({ metricKey, interactive = false }) => ({
  appearance: "none", border: 0,
  borderRight: {
    xs: 0,
    sm: metricKey !== "consensus" ? "1px solid rgba(255,255,255,0.075)" : 0,
  },
  borderBottom: {
    xs: metricKey !== "consensus" ? "1px solid rgba(255,255,255,0.075)" : 0,
    sm: 0,
  },
  textAlign: "left", font: "inherit", color: "inherit", minWidth: 0, minHeight: { xs: 78, lg: 84 }, px: { xs: 1.2, sm: 1.5, xl: 1.8 }, py: { xs: 1.1, lg: 1.25 },
  bgcolor: "transparent",
  cursor: interactive ? "pointer" : "default", transition: "background-color 160ms ease", "&:hover": interactive ? { bgcolor: "rgba(71, 213, 211, 0.095)" } : undefined,
  "&:focus-visible": interactive ? { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: -2 } : undefined,
});

export const dashboardKpiIconSx = () => ({
  width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0,
  color: "secondary.light", bgcolor: "rgba(44, 154, 199, 0.12)", border: "1px solid rgba(255,255,255,0.065)",
});

export const dashboardFirstRowSx = {
  display: "grid",
  width: "100%",
  minWidth: 0,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.55fr) minmax(340px, 0.9fr)" },
  gap: { xs: 1.5, md: 1.75, xl: 2 },
  alignItems: "start",
};

export const dashboardSecondRowSx = {
  display: "grid",
  width: "100%",
  minWidth: 0,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" },
  gap: { xs: 1.5, md: 1.75, xl: 2 },
  alignItems: "start",
};

export const dashboardItemSx = { minWidth: 0 };
export const dashboardCardSx = () => ({
  minWidth: 0, display: "flex", flexDirection: "column", p: { xs: 1.5, md: 1.8, xl: 2 }, borderRadius: 3,
  border: "1px solid rgba(85, 199, 216, 0.20)",
  bgcolor: "rgba(9, 19, 30, 0.91)",
  background: "linear-gradient(150deg, rgba(27, 111, 145, 0.18), rgba(9, 19, 30, 0.94) 46%)",
  boxShadow: "0 16px 38px rgba(0, 0, 0, 0.19)", transition: "border-color 160ms ease, box-shadow 160ms ease", "&:hover": { borderColor: "rgba(103, 224, 222, 0.42)", boxShadow: "0 18px 44px rgba(0, 0, 0, 0.24)" },
});
export const dashboardCardHeaderSx = { display: "flex", alignItems: "flex-start", gap: 1.15, mb: 1.55 };
export const dashboardCardNumberSx = { width: 32, height: 32, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "50%", bgcolor: "secondary.main", color: "secondary.contrastText", fontSize: 14, fontWeight: 950, boxShadow: "0 0 0 4px rgba(63, 203, 207, 0.08)" };
export const dashboardCardTitleSx = { fontSize: { xs: 17, xl: 18 }, lineHeight: 1.2, fontWeight: 950 };
export const dashboardCardSubtitleSx = { display: "block", mt: 0.3, color: "text.secondary", fontSize: 12.5, lineHeight: 1.35, fontWeight: 700 };
export const dashboardCardInnerSx = { minWidth: 0, flex: 1 };
export const dashboardCardBodySx = { minWidth: 0, flex: 1 };
export const dashboardCardFooterSx = { mt: 1.6, pt: 1.35, borderTop: "1px solid rgba(255,255,255,0.075)" };
export const dashboardCardActionSx = { width: "100%", minHeight: 40, px: 1.7, borderRadius: 1.4, textTransform: "none", fontSize: 13, fontWeight: 900, justifyContent: "space-between", "& .MuiButton-endIcon": { ml: "auto" } };
export const dashboardInnerPanelSx = { minWidth: 0, p: { xs: 1.1, xl: 1.25 }, borderRadius: 2, border: "1px solid rgba(255,255,255,0.085)", bgcolor: "rgba(5, 13, 22, 0.34)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)" };
export const dashboardDescriptionSx = { color: "text.secondary", whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 13.5, lineHeight: 1.55, fontWeight: 600 };
export const dashboardResultsUpperGridSx = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "0.9fr 1.1fr", md: "1fr", lg: "0.9fr 1.1fr" }, gap: 1 };
export const dashboardChartSx = { height: 220, minHeight: 220, width: "100%" };
export const dashboardEvaluationViewportSx = { width: "100%", minWidth: 0, height: { xs: 280, xl: 320 }, overflow: "auto", p: 1, borderRadius: 1.6, border: "1px solid rgba(255,255,255,0.08)", bgcolor: "rgba(3, 10, 17, 0.30)" };
export const dashboardBoundedListSx = { minWidth: 0, maxHeight: { xs: 150, md: 180 }, overflowY: "auto", overflowX: "hidden", pr: 0.4, scrollbarWidth: "thin", scrollbarColor: "rgba(72,189,205,0.48) rgba(5,13,21,0.15)" };
