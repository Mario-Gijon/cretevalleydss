import { Avatar, IconButton, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TuneIcon from '@mui/icons-material/Tune';

export default function SettingsHeader({ handleClose }) {
  const theme = useTheme();

  return (
    <Stack
      direction={"row"}
      justifyContent={"space-between"}
      p={1.4}
      alignItems={"center"}
      pb={1}
      pt={1}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
        background: `radial-gradient(900px 340px at 10% 0%, ${alpha(
          theme.palette.info.main,
          0.20
        )}, transparent 62%)`,
      }}
    >
      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: alpha(theme.palette.info.main, 0.16),
            color: "info.main",
            border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
          }}
        >
          <TuneIcon />
        </Avatar>

        <Typography
          sx={{ ml: 0.1, flex: 1, fontWeight: 700, letterSpacing: 0.1 }}
          variant="h6"
        >
          Settings
        </Typography>
      </Stack>

      <IconButton
        color="inherit"
        onClick={handleClose}
        aria-label="close"
        sx={{
          border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
          bgcolor: alpha(theme.palette.common.white, 0.04),
          "&:hover": {
            bgcolor: alpha(theme.palette.common.white, 0.09),
          },
        }}
      >
        <ExpandLessIcon />
      </IconButton>
    </Stack>
  );
}
