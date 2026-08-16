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
  flexDirection: { xs: "column", md: "row" },
  alignItems: { xs: "stretch", md: "center" },
  justifyContent: "space-between",
  gap: 1.2,
  p: { xs: 1.35, md: 1.65 },
};

export const evaluationsSelectorGroupSx = {
  display: "flex",
  flexDirection: { xs: "column", sm: "row" },
  alignItems: { xs: "stretch", sm: "center" },
  flexWrap: "wrap",
  gap: 1,
  width: { xs: "100%", md: "auto" },
  minWidth: 0,
};

export const evaluationsActionGroupSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: { xs: "stretch", md: "flex-end" },
  width: { xs: "100%", md: "auto" },
  minWidth: 0,
};

export const evaluationsWorkspaceSx = {
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
  borderRadius: 3,
  border: "1px solid rgba(83, 198, 214, 0.21)",
  bgcolor: "rgba(8, 18, 29, 0.93)",
  background:
    "linear-gradient(150deg, rgba(25, 105, 140, 0.16), rgba(8, 18, 29, 0.96) 48%)",
  boxShadow: "0 15px 36px rgba(0,0,0,0.18)",
};

export const evaluationsStageDividerWideSx = {
  display: { xs: "none", xl: "block" },
  borderColor: "rgba(83, 198, 214, 0.16)",
  my: { xl: 1.6 },
};

export const evaluationsStageDividerNarrowSx = {
  display: { xs: "block", xl: "none" },
  borderColor: "rgba(83, 198, 214, 0.16)",
  mx: { xs: 1.35, md: 1.65 },
};

export const evaluationsToggleSx = {
  width: { xs: "100%", sm: "auto" },
  justifyContent: "center",
  minHeight: 34,
  px: 1.35,
  borderRadius: 1.35,
  textTransform: "none",
  fontWeight: "fontWeightBold",
};

export const evaluationsExpertControlSx = {
  width: { xs: "100%", sm: 230 },
  minWidth: 0,
};

export const evaluationsPluginGridSx = (bothStages) => ({
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    xl: bothStages
      ? "minmax(0, 0.92fr) auto minmax(0, 1.08fr)"
      : "minmax(0, 1fr)",
  },
  alignItems: "stretch",
});

export const evaluationPluginPanelSx = {
  minWidth: 0,
  maxWidth: "100%",
  width: "100%",
  p: { xs: 1.35, md: 1.65 },
};

export const evaluationPluginRendererViewportSx = {
  ...localScrollbarSx,
  mt: 1.15,
  width: "100%",
  maxWidth: "100%",
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
  gridTemplateColumns: "minmax(0, 1fr)",
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
  overflowX: kind === "domains" ? "auto" : "hidden",
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
    md: "minmax(115px, 0.13fr) minmax(0, 0.87fr)",
  },
  gap: 0.8,
  alignItems: "start",
};

export const evaluationParticipationTableSx = {
  minWidth: 700,
  "& tbody tr": { cursor: "default" },
  "& th": {
    color: "rgba(190, 239, 246, 0.95)",
    backgroundColor: "rgba(28, 126, 157, 0.18)",
    fontSize: 11,
    fontWeight: 850,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  "& td, & th": {
    borderColor: "rgba(83, 198, 214, 0.18)",
    px: 0.9,
    py: 0.8,
    verticalAlign: "middle",
  },
  "& tbody tr:last-child td": { borderBottom: 0 },
};

export const evaluationParticipationTableContainerSx = {
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  ...localScrollbarSx,
  border: "1px solid rgba(255,255,255,0.075)",
  borderRadius: 1.6,
  bgcolor: "rgba(255,255,255,0.015)",
  alignSelf: "start",
  height: "max-content",
};

export const evaluationParticipantDetailSx = {
  px: 1.2,
  py: 1,
  bgcolor: "rgba(255,255,255,0.018)",
  borderTop: "1px solid rgba(255,255,255,0.05)",
};

export const evaluationParticipantIdentitySx = {
  display: "flex",
  alignItems: "center",
  gap: 0.7,
  minWidth: 150,
};

export const evaluationParticipantCellSx = {
  minWidth: 120,
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
