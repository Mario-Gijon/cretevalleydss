export const overviewGeneralGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" },
  gap: 1,
};

export const overviewDetailsGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
  gap: 2,
};

export const overviewExpertsGridSx = (hasConsensus) => ({
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: hasConsensus ? "repeat(2, minmax(0, 1fr))" : "1fr" },
  gap: 2,
});

export const overviewDescriptionSx = {
  fontWeight: 850,
  color: "text.primary",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

export const overviewListSx = { py: 0.25 };
export const overviewDividerSx = { opacity: 0.14 };
export const overviewExpertNameSx = { fontWeight: 850 };
export const overviewNotAcceptedTitleSx = { fontWeight: 950, color: "text.secondary" };
