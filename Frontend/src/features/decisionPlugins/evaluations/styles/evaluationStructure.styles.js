import { alpha } from "@mui/material/styles";

export const softIconBtnSx = (theme) => ({
  borderRadius: 3,
  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  bgcolor: alpha(theme.palette.common.white, 0.05),
  "&:hover": {
    bgcolor: alpha(theme.palette.common.white, 0.08),
  },
});
