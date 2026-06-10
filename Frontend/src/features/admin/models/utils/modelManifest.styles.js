import { alpha } from "@mui/material/styles";

export const chipSx = (theme, severity = "info") => {
  const color = theme.palette[severity]?.main || theme.palette.info.main;

  return {
    height: 26,
    borderRadius: 999,
    fontWeight: 950,
    color: "text.secondary",
    bgcolor: alpha(color, 0.1),
    borderColor: alpha(color, 0.28),
  };
};

export const modelTableContainerSx = (theme) => ({
  maxHeight: "64vh",
  borderRadius: 3,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  bgcolor: alpha(theme.palette.common.white, 0.02),
  overflow: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: `${alpha(theme.palette.common.white, 0.22)} transparent`,
  "&::-webkit-scrollbar": { width: 8, height: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(theme.palette.common.white, 0.16),
    borderRadius: 999,
    border: "2px solid transparent",
    backgroundClip: "content-box",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.24),
  },
});

export const modelTableHeadCellSx = (theme) => ({
  fontWeight: 950,
  color: alpha(theme.palette.common.white, 0.84),
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  bgcolor: "#1a2a2fcf",
  py: 1.1,
  whiteSpace: "nowrap",
});

export const modelTableBodyCellSx = (theme) => ({
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
  py: 1.15,
});
