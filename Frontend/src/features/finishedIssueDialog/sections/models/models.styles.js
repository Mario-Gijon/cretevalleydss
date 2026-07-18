const localScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(72, 189, 205, 0.48) rgba(5, 13, 21, 0.15)",
  "&::-webkit-scrollbar": { width: 7, height: 7 },
  "&::-webkit-scrollbar-track": { bgcolor: "rgba(5, 13, 21, 0.15)", borderRadius: 99 },
  "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(72, 189, 205, 0.38)", borderRadius: 99 },
};

export const modelsRootSx = { width: "100%", minWidth: 0 };

export const executionGalleryGridSx = ({ executionCount, carousel }) => ({
  width: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    sm: "repeat(2, minmax(260px, 1fr))",
    lg: carousel
      ? "minmax(0, 1fr)"
      : `repeat(${executionCount + 1}, minmax(260px, 1fr))`,
  },
  gap: 1.2,
  alignItems: "stretch",
});

export const executionCarouselShellSx = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr) 40px",
  gap: 0.65,
  alignItems: "stretch",
};

export const executionCarouselViewportSx = {
  minWidth: 0,
  width: "100%",
  overflow: "hidden",
};

const executionCarouselGap = 10;

export const executionCarouselTrackSx = ({ capacity, start }) => ({
  display: "flex",
  gap: `${executionCarouselGap}px`,
  transform: `translateX(calc(-${(start * 100) / capacity}% - ${(start * executionCarouselGap) / capacity}px))`,
  transition: "transform 260ms cubic-bezier(0.4, 0, 0.2, 1)",
  willChange: "transform",
  "@media (prefers-reduced-motion: reduce)": {
    transitionDuration: "1ms",
  },
});

export const executionCarouselItemSx = (capacity) => ({
  flex: `0 0 calc((100% - ${(capacity - 1) * executionCarouselGap}px) / ${capacity})`,
  minWidth: 0,
  "& > *": { height: "100%" },
});

export const executionCarouselControlSx = {
  width: 40,
  height: "100%",
  minHeight: "100%",
  alignSelf: "stretch",
  borderRadius: 2,
  border: "1px solid rgba(83, 198, 214, 0.22)",
  bgcolor: "#081521",
  color: "text.secondary",
  "&:hover": {
    bgcolor: "#102c3a",
    color: "secondary.light",
    borderColor: "secondary.main",
  },
  "&.Mui-disabled": {
    borderColor: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.22)",
  },
  "&:focus-visible": {
    outline: "2px solid",
    outlineColor: "secondary.main",
    outlineOffset: 2,
  },
};

export const executionCardSx = (selected, failed) => ({
  minWidth: { xs: 0, sm: 260 },
  minHeight: { xs: 250, md: 290 },
  p: { xs: 1.5, md: 2 },
  borderRadius: 3,
  border: selected ? "1px solid rgba(64, 224, 224, 0.95)" : failed ? "1px solid rgba(239, 83, 80, 0.48)" : "1px solid rgba(255,255,255,0.11)",
  bgcolor: "rgba(8, 18, 29, 0.93)",
  background: selected ? "linear-gradient(145deg, rgba(19, 126, 145, 0.30), rgba(8, 18, 29, 0.97) 66%)" : "linear-gradient(145deg, rgba(24, 82, 104, 0.14), rgba(8, 18, 29, 0.97) 66%)",
  color: "text.primary",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  boxShadow: selected ? "0 14px 34px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(45, 212, 191, 0.08)" : "0 10px 24px rgba(0, 0, 0, 0.16)",
  "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: 3 },
});

export const executionCardIconSx = { width: 46, height: 46, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "rgba(24, 147, 165, 0.17)", border: "1px solid rgba(63, 208, 215, 0.26)", color: "secondary.light" };

export const executionCardDescriptionSx = { mt: 1.5, mb: 1.5, color: "text.secondary", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "4.5em" };

export const addModelCardSx = ({ carousel = false } = {}) => ({
  appearance: "none", width: "100%", minWidth: carousel ? 0 : { xs: 0, sm: 260 }, height: carousel ? "100%" : "auto", minHeight: { xs: 250, md: 290 }, px: 2, borderRadius: 3,
  border: "1px dashed rgba(255,255,255,0.27)", bgcolor: "rgba(8, 18, 29, 0.50)", color: "text.primary", display: "grid", placeItems: "center", alignContent: "center", gap: 0.7, cursor: "pointer",
  "&:hover": { borderColor: "secondary.main", color: "secondary.light", bgcolor: "rgba(18, 75, 91, 0.20)" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: 3 },
});

export const selectedExecutionShellSx = { minWidth: 0, p: { xs: 1.25, md: 1.5 }, borderRadius: 3, border: "1px solid rgba(83, 198, 214, 0.18)", bgcolor: "rgba(8, 18, 29, 0.92)", background: "linear-gradient(150deg, rgba(25, 105, 140, 0.12), rgba(8, 18, 29, 0.97) 52%)" };

export const modelParametersViewportSx = { ...localScrollbarSx, mt: 1, minWidth: 0, maxWidth: "100%", maxHeight: { xs: 420, md: 500 }, overflow: "auto" };

export const rawOutputShellSx = { borderRadius: "12px !important", border: "1px solid rgba(83, 198, 214, 0.18)", bgcolor: "rgba(8, 18, 29, 0.91)", background: "linear-gradient(150deg, rgba(25, 105, 140, 0.10), rgba(8, 18, 29, 0.95) 48%)", "&::before": { display: "none" } };

export const rawOutputPreSx = { ...localScrollbarSx, m: 0, p: 1, maxHeight: 430, overflow: "auto", borderRadius: 1.5, bgcolor: "rgba(2, 7, 12, 0.62)", color: "rgba(148, 235, 163, 0.94)", fontSize: 11.5, lineHeight: 1.45, whiteSpace: "pre" };
