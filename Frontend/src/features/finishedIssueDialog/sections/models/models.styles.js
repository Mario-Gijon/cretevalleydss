const localScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(72, 189, 205, 0.48) rgba(5, 13, 21, 0.15)",
  "&::-webkit-scrollbar": { width: 7, height: 7 },
  "&::-webkit-scrollbar-track": { bgcolor: "rgba(5, 13, 21, 0.15)", borderRadius: 99 },
  "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(72, 189, 205, 0.38)", borderRadius: 99 },
};

export const modelsRootSx = { width: "100%", minWidth: 0 };

export const executionCarouselShellSx = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  gap: 0.7,
  alignItems: "center",
  minWidth: 0,
};

export const executionCarouselGridSx = (visibleCount) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))`,
  gap: 1,
  minWidth: 0,
});

export const executionCardSx = (selected) => ({
  appearance: "none",
  width: "100%",
  minWidth: 0,
  minHeight: 118,
  p: 1.2,
  borderRadius: 2.5,
  border: selected ? "1px solid rgba(72, 213, 213, 0.82)" : "1px solid rgba(255,255,255,0.09)",
  bgcolor: selected ? "rgba(18, 75, 91, 0.34)" : "rgba(8, 18, 29, 0.90)",
  background: selected ? "linear-gradient(145deg, rgba(29, 153, 160, 0.22), rgba(8, 18, 29, 0.94))" : "linear-gradient(145deg, rgba(24, 82, 104, 0.12), rgba(8, 18, 29, 0.95))",
  color: "text.primary",
  cursor: "pointer",
  textAlign: "left",
  "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: 2 },
});

export const selectedExecutionShellSx = {
  minWidth: 0,
  p: { xs: 1.25, md: 1.55 },
  borderRadius: 3,
  border: "1px solid rgba(83, 198, 214, 0.18)",
  bgcolor: "rgba(8, 18, 29, 0.91)",
  background: "linear-gradient(150deg, rgba(25, 105, 140, 0.13), rgba(8, 18, 29, 0.95) 48%)",
};

export const selectedExecutionGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(250px, 0.75fr) minmax(0, 1.25fr)" },
  gap: 1,
  alignItems: "stretch",
};

export const modelInnerPanelSx = {
  minWidth: 0,
  p: 1.15,
  borderRadius: 2,
  border: "1px solid rgba(255,255,255,0.075)",
  bgcolor: "rgba(3, 10, 17, 0.26)",
};

export const modelParametersViewportSx = {
  ...localScrollbarSx,
  mt: 1,
  minWidth: 0,
  maxWidth: "100%",
  maxHeight: { xs: 420, md: 480 },
  overflow: "auto",
};

export const rawOutputShellSx = {
  borderRadius: "12px !important",
  border: "1px solid rgba(83, 198, 214, 0.18)",
  bgcolor: "rgba(8, 18, 29, 0.91)",
  background: "linear-gradient(150deg, rgba(25, 105, 140, 0.10), rgba(8, 18, 29, 0.95) 48%)",
  "&::before": { display: "none" },
};

export const rawOutputPreSx = {
  ...localScrollbarSx,
  m: 0,
  p: 1,
  maxHeight: 430,
  overflow: "auto",
  borderRadius: 1.5,
  bgcolor: "rgba(2, 7, 12, 0.62)",
  color: "rgba(148, 235, 163, 0.94)",
  fontSize: 11.5,
  lineHeight: 1.45,
  whiteSpace: "pre",
};

export const inlineAddModelSx = {
  minWidth: 0,
  p: { xs: 1.25, md: 1.55 },
  borderRadius: 3,
  border: "1px solid rgba(83, 198, 214, 0.21)",
  bgcolor: "rgba(8, 18, 29, 0.92)",
  background: "linear-gradient(150deg, rgba(25, 105, 140, 0.15), rgba(8, 18, 29, 0.96) 48%)",
};
