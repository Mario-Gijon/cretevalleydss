import { alpha } from "@mui/material/styles";

export const criterionSelectorSx = {
  container: {
    mb: 1,
  },
  navigation: {
    minWidth: 0,
  },
  toggleViewport: {
    minWidth: 0,
    flex: 1,
    overflowX: "auto",
    overflowY: "hidden",
    pr: 0.25,
  },
  position: {
    fontWeight: 900,
    minWidth: 42,
    textAlign: "center",
    color: "text.secondary",
  },
  name: {
    fontWeight: 850,
  },
  type: {
    color: "text.secondary",
    fontSize: "0.75rem",
    lineHeight: 1.2,
    fontWeight: 700,
    letterSpacing: 0.2,
    textTransform: "none",
  },
};

export const buildCriterionToggleGroupSx = (theme) => ({
  display: "inline-flex",
  gap: 0.75,
  "& .MuiToggleButton-root": {
    borderRadius: 999,
    px: 1.25,
    py: 0.35,
    minHeight: 28,
    border: `1px solid ${alpha(theme.palette.common.white, 0.14)}`,
    color: "text.secondary",
    textTransform: "none",
    fontWeight: 700,
    whiteSpace: "nowrap",
    bgcolor: alpha(theme.palette.background.paper, 0.2),
  },
  "& .MuiToggleButton-root.Mui-selected": {
    color: "info.light",
    borderColor: alpha(theme.palette.info.main, 0.45),
    bgcolor: alpha(theme.palette.info.main, 0.16),
  },
});
