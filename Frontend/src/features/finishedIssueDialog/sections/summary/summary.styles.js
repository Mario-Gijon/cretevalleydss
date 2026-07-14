export const summaryGeneralGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" },
  gap: 1,
};

export const summaryDetailsGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
  gap: 2,
};

export const summaryExpertsGridSx = (hasConsensus) => ({
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: hasConsensus ? "repeat(2, minmax(0, 1fr))" : "1fr" },
  gap: 2,
});

export const summaryDescriptionSx = {
  fontWeight: 850,
  color: "text.primary",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

export const summaryListSx = { py: 0.25 };
export const summaryDividerSx = { opacity: 0.14 };
export const summaryExpertNameSx = { fontWeight: 850 };
export const summaryNotAcceptedTitleSx = { fontWeight: 950, color: "text.secondary" };
