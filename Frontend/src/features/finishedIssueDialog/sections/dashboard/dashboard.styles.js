export const dashboardRootSx = {
  width: "100%",
  minWidth: 0,
};

export const dashboardGridSx = (hasConsensus) => ({
  display: "grid",
  width: "100%",
  minWidth: 0,

  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    md: "repeat(2, minmax(0, 1fr))",
    lg: "repeat(12, minmax(0, 1fr))",
  },

  gridTemplateAreas: {
    xs: hasConsensus
      ? `
          "results"
          "overview"
          "evaluations"
          "consensus"
          "models"
        `
      : `
          "results"
          "overview"
          "evaluations"
          "models"
        `,

    md: hasConsensus
      ? `
          "results results"
          "overview evaluations"
          "consensus models"
        `
      : `
          "results results"
          "overview evaluations"
          "models models"
        `,

    lg: hasConsensus
      ? `
          "overview overview overview overview results results results results results results results results"
          "evaluations evaluations evaluations evaluations consensus consensus consensus consensus models models models models"
        `
      : `
          "overview overview overview overview results results results results results results results results"
          "evaluations evaluations evaluations evaluations evaluations evaluations models models models models models models"
        `,
  },

  gap: {
    xs: 1.5,
    md: 1.75,
    lg: 2,
  },

  alignItems: "stretch",
});

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
};

export const dashboardCardBodySx = {
  minWidth: 0,
};

export const dashboardCardFooterSx = {
  display: "flex",
  alignItems: "center",
  mt: 1.5,
  pt: 1.25,
  borderTop: "1px solid rgba(255,255,255,0.07)",
};

export const dashboardCardActionSx = {
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