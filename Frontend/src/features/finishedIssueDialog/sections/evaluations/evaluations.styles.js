const localScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor:
    "rgba(72, 189, 205, 0.48) rgba(5, 13, 21, 0.15)",
  "&::-webkit-scrollbar": {
    width: 7,
    height: 7,
  },
  "&::-webkit-scrollbar-track": {
    bgcolor: "rgba(5, 13, 21, 0.15)",
    borderRadius: 99,
  },
  "&::-webkit-scrollbar-thumb": {
    bgcolor: "rgba(72, 189, 205, 0.38)",
    borderRadius: 99,
  },
  "&::-webkit-scrollbar-thumb:hover": {
    bgcolor: "rgba(72, 189, 205, 0.58)",
  },
};

export const evaluationsRootSx = {
  width: "100%",
  minWidth: 0,
};

export const evaluationsHeaderSx = {
  display: "flex",
  flexDirection: { xs: "column", sm: "row" },
  alignItems: { xs: "stretch", sm: "center" },
  justifyContent: "space-between",
  gap: 1.2,
  mb: 1.5,
  px: 0.2,
};

export const evaluationsRoundControlSx = {
  minWidth: 190,
};

export const evaluationsToggleSx = {
  minHeight: 34,
  px: 1.35,
  borderRadius: 1.35,
  textTransform: "none",
  fontSize: 12,
  fontWeight: 900,
};

export const evaluationsExpertControlSx = {
  minWidth: { xs: "100%", sm: 230 },
};

export const evaluationsPluginGridSx = (bothStages) => ({
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    xl: bothStages
      ? "minmax(0, 0.92fr) minmax(0, 1.08fr)"
      : "minmax(0, 1fr)",
  },
  gap: { xs: 1.5, md: 1.75 },
  alignItems: "stretch",
});

export const evaluationPluginPanelSx = (fullWidth) => ({
  minWidth: 0,
  width: "100%",
  p: { xs: 1.35, md: 1.65 },
  borderRadius: 3,
  border: "1px solid rgba(83, 198, 214, 0.21)",
  bgcolor: "rgba(8, 18, 29, 0.93)",
  background:
    "linear-gradient(150deg, rgba(25, 105, 140, 0.16), rgba(8, 18, 29, 0.96) 48%)",
  boxShadow: "0 15px 36px rgba(0,0,0,0.18)",
  ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
});

export const evaluationPluginRendererViewportSx = {
  ...localScrollbarSx,
  mt: 1.15,
  width: "100%",
  minWidth: 0,
  maxHeight: { xs: 520, xl: 620 },
  overflow: "auto",
  p: 0.85,
  borderRadius: 1.8,
  border: "1px solid rgba(255,255,255,0.08)",
  bgcolor: "rgba(3, 10, 17, 0.32)",
};

export const evaluationsLowerGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    lg: "minmax(0, 0.95fr) minmax(0, 1.05fr)",
  },
  gap: { xs: 1.5, md: 1.75 },
  mt: { xs: 1.5, md: 1.75 },
  alignItems: "stretch",
};

export const evaluationsPanelSx = {
  minWidth: 0,
  p: { xs: 1.35, md: 1.6 },
  borderRadius: 3,
  border: "1px solid rgba(83, 198, 214, 0.18)",
  bgcolor: "rgba(8, 18, 29, 0.90)",
  background:
    "linear-gradient(150deg, rgba(25, 105, 140, 0.13), rgba(8, 18, 29, 0.95) 48%)",
};

export const evaluationsPanelHeaderSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.8,
  mb: 1.15,
};

export const evaluationsScrollableSx = (kind) => ({
  ...localScrollbarSx,
  minWidth: 0,
  overflowY: "auto",
  overflowX: kind === "participants" || kind === "domains" ? "auto" : "hidden",
  pr: 0.35,
  maxHeight:
    kind === "domains"
      ? { xs: 320, md: 360, xl: 400 }
      : { xs: 330, md: 370, xl: 420 },
});

export const evaluationParticipationGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    sm: "220px minmax(0, 1fr)",
  },
  gap: 1.1,
  alignItems: "stretch",
};

export const evaluationParticipantRowSx = {
  display: "grid",
  gridTemplateColumns:
    "34px minmax(120px, 1fr) minmax(130px, 0.85fr) auto",
  gap: 0.75,
  alignItems: "center",
  minWidth: 620,
  px: 0.85,
  py: 0.72,
  borderRadius: 1.4,
  border: "1px solid rgba(255,255,255,0.075)",
  bgcolor: "rgba(255,255,255,0.02)",
};

export const evaluationsEvidenceFooterSx = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: { xs: 0.75, md: 1.4 },
  mt: { xs: 1.5, md: 1.75 },
  px: 1.2,
  py: 0.9,
  borderRadius: 2.2,
  border: "1px solid rgba(83, 198, 214, 0.15)",
  bgcolor: "rgba(8, 18, 29, 0.82)",
};
