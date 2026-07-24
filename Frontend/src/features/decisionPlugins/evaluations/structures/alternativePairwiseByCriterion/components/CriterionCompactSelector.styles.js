import { alpha } from "@mui/material/styles";

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
