export const dashboardRootSx = { width: "100%", maxWidth: "none" };

export const dashboardGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",
    md: "repeat(2, minmax(0, 1fr))",
    xl: "repeat(3, minmax(0, 1fr))",
  },
  gap: 2,
  alignItems: "stretch",
};

export const dashboardCardContentSx = {
  minHeight: { xs: 0, md: 240 },
  height: "100%",
};

export const dashboardActionSx = { alignSelf: { xs: "stretch", sm: "flex-start" } };

export const dashboardDescriptionSx = {
  whiteSpace: "pre-line",
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export const dashboardGraphPreviewSx = { height: 165, mb: 0.5 };
