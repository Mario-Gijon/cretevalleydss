export const dashboardRootSx = {
  display: "grid",
  width: "100%",
  minWidth: 0,
  gap: { xs: 0.9, md: 1, xl: 1.2 },
};

export const dashboardFirstRowSx = {
  display: "grid",
  width: "100%",
  minWidth: 0,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.55fr) minmax(340px, 0.9fr)" },
  gap: { xs: 0.9, md: 1, xl: 1.2 },
  alignItems: "stretch",
};

export const dashboardSecondRowSx = {
  display: "grid",
  width: "100%",
  minWidth: 0,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" },
  gap: { xs: 0.9, md: 1, xl: 1.2 },
  alignItems: "stretch",
};

export const dashboardItemSx = { minWidth: 0, display: "flex", "& > *": { width: "100%", height: "100%" } };
export const dashboardCardSx = () => ({
  height: "100%", minWidth: 0, display: "flex", flexDirection: "column", p: { xs: 1.15, md: 1.35, xl: 1.5 }, borderRadius: 3,
  border: "1px solid rgba(85, 199, 216, 0.20)",
  bgcolor: "rgba(9, 19, 30, 0.91)",
  background: "linear-gradient(150deg, rgba(27, 111, 145, 0.18), rgba(9, 19, 30, 0.94) 46%)",
  /* boxShadow: "0 16px 38px rgba(0, 0, 0, 0.19)", transition: "border-color 160ms ease, box-shadow 160ms ease", "&:hover": { borderColor: "rgba(103, 224, 222, 0.42)", boxShadow: "0 18px 44px rgba(0, 0, 0, 0.24)" }, */
});
export const dashboardCardHeaderSx = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.8, mb: 2 };
export const dashboardCardIconSx = { width: 32, height: 32, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "50%", color: "secondary.light", bgcolor: "rgba(63, 203, 207, 0.14)", border: "1px solid rgba(255,255,255,0.07)", mb:0.5 };
export const dashboardCardTitleSx = { fontSize: { xs: 18, xl: 19 }, lineHeight: 1.2, fontWeight: 950 };
export const dashboardCardInnerSx = { minWidth: 0, flex: 1 };
export const dashboardCardBodySx = { minWidth: 0, flex: 1 };
export const dashboardCardFooterSx = { mt: 0.8, pt: 0.8, borderTop: "1px solid rgba(255,255,255,0.075)" };
export const dashboardCardActionSx = { width: "100%", minHeight: 36, px: 1.45, borderRadius: 1.25, textTransform: "none", fontSize: 13, fontWeight: 900, justifyContent: "space-between", "& .MuiButton-endIcon": { ml: "auto" } };
export const dashboardInnerPanelSx = { minWidth: 0, p: { xs: 0.9, xl: 1.05 }, borderRadius: 2, border: "1px solid rgba(255,255,255,0.085)", bgcolor: "rgba(5, 13, 22, 0.34)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)" };
export const dashboardDescriptionSx = { color: "text.secondary", whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 13.5, lineHeight: 1.55, fontWeight: 600 };
export const dashboardResultsUpperGridSx = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "0.9fr 1.1fr", md: "1fr", lg: "0.9fr 1.1fr" }, gap: 0.75 };
export const dashboardChartSx = { height: 220, minHeight: 220, width: "100%" };
export const dashboardEvaluationViewportSx = { width: "100%", minWidth: 0, height: { xs: 250, xl: 285 }, overflow: "auto", p: 0.8, borderRadius: 1.6, border: "1px solid rgba(255,255,255,0.08)", bgcolor: "rgba(3, 10, 17, 0.30)" };
export const dashboardBoundedListSx = { minWidth: 0, maxHeight: { xs: 150, md: 180 }, overflowY: "auto", overflowX: "hidden", pr: 0.4, scrollbarWidth: "thin", scrollbarColor: "rgba(72,189,205,0.48) rgba(5,13,21,0.15)" };
