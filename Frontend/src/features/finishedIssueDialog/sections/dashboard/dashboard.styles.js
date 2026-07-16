export const dashboardRootSx = { width: "100%", minWidth: 0 };

export const dashboardKpiStripSx = {
  display: "grid",
  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" },
  mb: { xs: 1.5, md: 2 },
  border: "1px solid rgba(100, 211, 219, 0.18)",
  borderRadius: 3,
  overflow: "hidden",
  bgcolor: "rgba(9, 20, 31, 0.88)",
  background: "linear-gradient(110deg, rgba(22, 93, 124, 0.20), rgba(9, 22, 34, 0.92) 45%, rgba(22, 103, 81, 0.16))",
  boxShadow: "0 14px 34px rgba(0, 0, 0, 0.16)",
};

export const dashboardKpiItemSx = ({ tone = "default", interactive = false, index = 0 }) => ({
  appearance: "none", border: 0,
  borderRight: { xs: index % 2 === 0 ? "1px solid rgba(255,255,255,0.075)" : 0, sm: index % 3 !== 2 ? "1px solid rgba(255,255,255,0.075)" : 0, lg: index < 4 ? "1px solid rgba(255,255,255,0.075)" : 0 },
  borderBottom: { xs: index < 4 ? "1px solid rgba(255,255,255,0.075)" : 0, sm: index < 3 ? "1px solid rgba(255,255,255,0.075)" : 0, lg: 0 },
  textAlign: "left", font: "inherit", color: "inherit", minWidth: 0, minHeight: { xs: 78, lg: 84 }, px: { xs: 1.2, sm: 1.5, xl: 1.8 }, py: { xs: 1.1, lg: 1.25 },
  bgcolor: tone === "winner" ? "rgba(231, 188, 62, 0.055)" : tone === "success" ? "rgba(63, 193, 139, 0.055)" : "transparent",
  cursor: interactive ? "pointer" : "default", transition: "background-color 160ms ease", "&:hover": interactive ? { bgcolor: "rgba(71, 213, 211, 0.095)" } : undefined,
  "&:focus-visible": interactive ? { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: -2 } : undefined,
});

export const dashboardKpiIconSx = (tone = "default") => ({
  width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0,
  color: tone === "winner" ? "#e7bd36" : tone === "success" ? "success.light" : "secondary.light",
  bgcolor: tone === "winner" ? "rgba(231, 189, 54, 0.12)" : tone === "success" ? "rgba(63, 193, 139, 0.12)" : "rgba(44, 154, 199, 0.12)", border: "1px solid rgba(255,255,255,0.065)",
});

export const dashboardGridSx = {
  display: "grid", width: "100%", minWidth: 0,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", xl: "0.95fr 1.2fr 1.15fr 1fr" },
  gridTemplateAreas: { xs: `"overview" "results" "evaluations" "models"`, md: `"overview results" "evaluations models"`, xl: `"overview results evaluations models"` },
  gap: { xs: 1.5, md: 1.75, xl: 2 }, alignItems: "stretch",
};

export const dashboardItemSx = (gridArea) => ({ gridArea, minWidth: 0, "& > *": { height: "100%" } });
export const dashboardCardSx = (accent = "cyan") => ({
  height: "100%", minWidth: 0, display: "flex", flexDirection: "column", p: { xs: 1.5, md: 1.8, xl: 2 }, borderRadius: 3,
  border: accent === "green" ? "1px solid rgba(80, 205, 147, 0.22)" : accent === "gold" ? "1px solid rgba(231, 190, 77, 0.22)" : "1px solid rgba(85, 199, 216, 0.20)",
  bgcolor: "rgba(9, 19, 30, 0.91)",
  background: accent === "green" ? "linear-gradient(150deg, rgba(44, 143, 102, 0.17), rgba(9, 19, 30, 0.94) 46%)" : accent === "gold" ? "linear-gradient(150deg, rgba(127, 101, 29, 0.14), rgba(9, 19, 30, 0.94) 46%)" : "linear-gradient(150deg, rgba(27, 111, 145, 0.18), rgba(9, 19, 30, 0.94) 46%)",
  boxShadow: "0 16px 38px rgba(0, 0, 0, 0.19)", transition: "border-color 160ms ease, box-shadow 160ms ease", "&:hover": { borderColor: "rgba(103, 224, 222, 0.42)", boxShadow: "0 18px 44px rgba(0, 0, 0, 0.24)" },
});
export const dashboardCardHeaderSx = { display: "flex", alignItems: "flex-start", gap: 1.15, mb: 1.55 };
export const dashboardCardNumberSx = { width: 32, height: 32, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "50%", bgcolor: "secondary.main", color: "secondary.contrastText", fontSize: 14, fontWeight: 950, boxShadow: "0 0 0 4px rgba(63, 203, 207, 0.08)" };
export const dashboardCardTitleSx = { fontSize: { xs: 17, xl: 18 }, lineHeight: 1.2, fontWeight: 950 };
export const dashboardCardSubtitleSx = { display: "block", mt: 0.3, color: "text.secondary", fontSize: 12.5, lineHeight: 1.35, fontWeight: 700 };
export const dashboardCardInnerSx = { minWidth: 0, height: "100%", flex: 1 };
export const dashboardCardBodySx = { minWidth: 0, flex: 1 };
export const dashboardCardFooterSx = { mt: 1.6, pt: 1.35, borderTop: "1px solid rgba(255,255,255,0.075)" };
export const dashboardCardActionSx = { width: "100%", minHeight: 40, px: 1.7, borderRadius: 1.4, textTransform: "none", fontSize: 13, fontWeight: 900, justifyContent: "space-between", "& .MuiButton-endIcon": { ml: "auto" } };
export const dashboardInnerPanelSx = { minWidth: 0, p: { xs: 1.1, xl: 1.25 }, borderRadius: 2, border: "1px solid rgba(255,255,255,0.085)", bgcolor: "rgba(5, 13, 22, 0.34)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)" };
export const dashboardInfoRowSx = { display: "grid", gridTemplateColumns: "34px minmax(0, 1fr)", gap: 1, alignItems: "center", px: 1, py: 0.9, borderRadius: 1.5, border: "1px solid rgba(255,255,255,0.075)", bgcolor: "rgba(255,255,255,0.018)" };
export const dashboardInfoIconSx = (tone = "cyan") => ({ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", color: tone === "gold" ? "#dfb734" : tone === "green" ? "success.light" : "secondary.light", bgcolor: tone === "gold" ? "rgba(223,183,52,0.11)" : tone === "green" ? "rgba(74,190,132,0.11)" : "rgba(50,157,199,0.11)" });
export const dashboardDescriptionSx = { color: "text.secondary", whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 13.5, lineHeight: 1.55, fontWeight: 600 };
export const dashboardResultsUpperGridSx = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "0.9fr 1.1fr", md: "1fr", lg: "0.9fr 1.1fr" }, gap: 1 };
export const dashboardChartSx = { height: 220, minHeight: 220, width: "100%" };
export const dashboardEvaluationViewportSx = { width: "100%", minWidth: 0, height: { xs: 280, xl: 320 }, overflow: "auto", p: 1, borderRadius: 1.6, border: "1px solid rgba(255,255,255,0.08)", bgcolor: "rgba(3, 10, 17, 0.30)" };
export const dashboardParameterCodeSx = { m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace', fontSize: 11.5, lineHeight: 1.55, color: "rgba(190, 232, 207, 0.92)" };
