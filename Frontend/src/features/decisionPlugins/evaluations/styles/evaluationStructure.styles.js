import { alpha } from "@mui/material/styles";

export const softIconBtnSx = (theme) => ({
  borderRadius: 3,
  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  bgcolor: alpha(theme.palette.common.white, 0.05),
  "&:hover": {
    bgcolor: alpha(theme.palette.common.white, 0.08),
  },
});

export const sectionSx = (theme) => ({
  borderRadius: 4,
  bgcolor: alpha(theme.palette.common.white, 0.03),
  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
});

export const inputSx = (theme) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    bgcolor: alpha(theme.palette.common.white, 0.04),
  },
});
