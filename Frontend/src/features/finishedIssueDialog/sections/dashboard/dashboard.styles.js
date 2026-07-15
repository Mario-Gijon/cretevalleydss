export const dashboardRootSx = {
  width: "100%",
  minWidth: 0,
  pb: 0.5,
};

export const dashboardKpiStripSx = {
  display: "grid",
  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(5, minmax(0, 1fr))" },
  gap: { xs: 0.35, sm: 0 },
  mb: { xs: 1.35, md: 1.7 },
  p: { xs: 0.65, sm: 0.75 },
  border: "1px solid rgba(103, 222, 221, 0.16)",
  borderRadius: 2.6,
  bgcolor: "rgba(10, 20, 31, 0.74)",
  background: "linear-gradient(118deg, rgba(40, 144, 177, 0.13), rgba(12, 38, 45, 0.30) 55%, rgba(40, 155, 118, 0.11))",
};

export const dashboardKpiItemSx = (tone, clickable) => ({
  appearance: "none",
  border: 0,
  textAlign: "left",
  font: "inherit",
  color: "inherit",
  minWidth: 0,
  p: { xs: 0.75, sm: 0.95 },
  borderRadius: 1.7,
  bgcolor: tone === "winner" ? "rgba(234, 190, 82, 0.08)" : tone === "success" ? "rgba(61, 190, 133, 0.08)" : "transparent",
  cursor: clickable ? "pointer" : "default",
  transition: "background-color 160ms ease, border-color 160ms ease",
  "&:hover": clickable ? { bgcolor: "rgba(70, 220, 215, 0.11)" } : undefined,
});

export const dashboardGridSx = {
  display: "grid",
  width: "100%",
  minWidth: 0,

  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    md: "repeat(2, minmax(0, 1fr))",
    lg: "0.95fr 1.2fr 1.15fr 1fr",
  },

  gridTemplateAreas: {
    xs: `"overview" "results" "evaluations" "models"`,
    md: `"overview results" "evaluations models"`,
    lg: `"overview results evaluations models"`,
  },

  gap: {
    xs: 1.5,
    md: 1.75,
    lg: 2,
  },

  alignItems: "stretch",
  minHeight: { lg: "clamp(420px, calc(100vh - 310px), 660px)" },
};

export const dashboardItemSx = (gridArea) => ({
  gridArea,
  minWidth: 0,

  "& > *": {
    height: "100%",
  },
});

export const dashboardCardInnerSx = {
  minWidth: 0,
  height: "100%",
  flex: 1,
  pt: 1.4,
};

export const dashboardCardBodySx = {
  minWidth: 0,
  flex: 1,
};

export const dashboardCardSx = (accent = "cyan") => ({
  height: "100%",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  p: { xs: 1.35, md: 1.6 },
  borderRadius: 2.75,
  border: `1px solid ${accent === "green" ? "rgba(87, 211, 151, 0.20)" : accent === "gold" ? "rgba(235, 192, 91, 0.20)" : "rgba(90, 203, 218, 0.18)"}`,
  bgcolor: "rgba(11, 21, 32, 0.84)",
  background: accent === "green" ? "linear-gradient(150deg, rgba(62, 174, 124, 0.13), rgba(11, 21, 32, 0.87) 48%)" : "linear-gradient(150deg, rgba(38, 144, 178, 0.14), rgba(11, 21, 32, 0.87) 48%)",
  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.16)",
  transition: "border-color 160ms ease, box-shadow 160ms ease",
  "&:hover": { borderColor: "rgba(103, 229, 225, 0.42)", boxShadow: "0 15px 34px rgba(0, 0, 0, 0.22)" },
});

export const dashboardCardFooterSx = {
  display: "flex",
  alignItems: "center",
  mt: 1.5,
  pt: 1.25,
  borderTop: "1px solid rgba(255,255,255,0.07)",
};

export const dashboardCardActionSx = {
  width: "100%",
  minHeight: 34,
  px: 1.45,
  borderRadius: 1.25,
  textTransform: "none",
  fontSize: 12,
  fontWeight: 800,

  "& .MuiButton-endIcon": {
    ml: 0.75,
  },
};

export const dashboardMetaTextSx = {
  display: "block",
  color: "text.secondary",
  lineHeight: 1.45,
  fontWeight: 600,
};

export const dashboardDescriptionSx = {
  whiteSpace: "pre-line",
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: 1.55,
};

export const dashboardGraphPreviewSx = {
  width: "100%",
  height: {
    xs: 190,
    md: 210,
    lg: 220,
  },
};
