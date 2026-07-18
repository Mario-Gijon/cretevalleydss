const localScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(72,189,205,0.48) rgba(5,13,21,0.15)",
  "&::-webkit-scrollbar": { width: 7, height: 7 },
  "&::-webkit-scrollbar-track": {
    bgcolor: "rgba(5,13,21,0.15)",
    borderRadius: 99,
  },
  "&::-webkit-scrollbar-thumb": {
    bgcolor: "rgba(72,189,205,0.38)",
    borderRadius: 99,
  },
};

export const visualizationsGridSx = (showConsensus) => ({
  display: "grid",
  gridTemplateColumns: showConsensus
    ? {
        xs: "minmax(0, 1fr)",
        lg: "minmax(0, 1.15fr) minmax(360px, 0.85fr)",
      }
    : "minmax(0, 1fr)",
  gap: 1.2,
  alignItems: "stretch",
});

export const visualizationCardSx = ({ fullWidth }) => ({
  minWidth: 0,
  width: "100%",
  height: "100%",
  p: { xs: 1.2, md: 1.5 },
  display: "flex",
  flexDirection: "column",
  borderRadius: 3,
  border: "1px solid rgba(83,198,214,0.18)",
  bgcolor: "rgba(8,18,29,0.94)",
  background:
    "linear-gradient(150deg, rgba(25,105,140,0.11), rgba(8,18,29,0.98) 52%)",
  gridColumn: fullWidth ? "1 / -1" : "auto",
});

export const visualizationHeaderSx = {
  minWidth: 0,
  minHeight: 48,
  flexDirection: { xs: "column", sm: "row" },
  justifyContent: "space-between",
  alignItems: { xs: "stretch", sm: "center" },
  gap: 1,
};

export const visualizationChartFrameSx = (type) => ({
  ...localScrollbarSx,
  mt: 1.1,
  width: "100%",
  minWidth: 0,
  height:
    type === "scatter"
      ? { xs: 320, sm: 380, md: 430, xl: 480 }
      : { xs: 300, sm: 360, md: 410, xl: 480 },
  minHeight:
    type === "scatter"
      ? { xs: 320, sm: 380, md: 430, xl: 480 }
      : { xs: 300, sm: 360, md: 410, xl: 480 },
  maxHeight:
    type === "scatter"
      ? { xs: 320, sm: 380, md: 430, xl: 480 }
      : { xs: 300, sm: 360, md: 410, xl: 480 },
  flex: "0 0 auto",
  position: "relative",
  overflow: "hidden",
});

export const visualizationEmptySx = {
  mt: 1.1,
  minHeight: { xs: 260, md: 410, xl: 480 },
  flex: "1 1 auto",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  px: 2,
  borderRadius: 2,
  border: "1px dashed rgba(83,198,214,0.14)",
  bgcolor: "rgba(3,10,17,0.18)",
};

export const visualizationFooterSx = {
  mt: "auto",
  pt: 0.9,
  color: "text.secondary",
  fontSize: 10.5,
};

export const visualizationsNoticeSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  p: { xs: 1.2, md: 1.5 },
  borderRadius: 3,
  border: "1px solid rgba(83,198,214,0.18)",
  bgcolor: "rgba(8,18,29,0.92)",
  background:
    "linear-gradient(90deg, rgba(24,147,165,0.14), rgba(8,18,29,0.98) 58%)",
};

export const comparisonVisualizationsPlaceholderSx = {
  minHeight: 300,
  justifyContent: "center",
  alignItems: "center",
  gap: 1,
  px: 2,
  borderRadius: 3,
  border: "1px solid rgba(83,198,214,0.16)",
  bgcolor: "rgba(8,18,29,0.90)",
};
