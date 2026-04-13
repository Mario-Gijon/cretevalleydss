import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

/**
 * Badge compacto usado dentro del flujo de expertos.
 *
 * @param {Object} props Props del componente.
 * @param {string} props.tone Tono visual.
 * @param {*} props.children Contenido visible.
 * @returns {JSX.Element}
 */
const IssueExpertsPill = ({ tone = "info", children }) => {
  const theme = useTheme();

  const toneMap = {
    info: {
      color: theme.palette.info.main,
      bg: alpha(theme.palette.info.main, 0.14),
      border: alpha(theme.palette.info.main, 0.24),
    },
    warning: {
      color: theme.palette.warning.main,
      bg: alpha(theme.palette.warning.main, 0.14),
      border: alpha(theme.palette.warning.main, 0.24),
    },
    error: {
      color: theme.palette.error.main,
      bg: alpha(theme.palette.error.main, 0.14),
      border: alpha(theme.palette.error.main, 0.24),
    },
    success: {
      color: theme.palette.success.main,
      bg: alpha(theme.palette.success.main, 0.14),
      border: alpha(theme.palette.success.main, 0.24),
    },
  };

  const resolvedTone = toneMap[tone] || toneMap.info;

  return (
    <Box
      sx={{
        px: 1,
        py: 0.32,
        borderRadius: 999,
        bgcolor: resolvedTone.bg,
        border: "1px solid",
        borderColor: resolvedTone.border,
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 950, color: resolvedTone.color }}
      >
        {children}
      </Typography>
    </Box>
  );
};

export default IssueExpertsPill;