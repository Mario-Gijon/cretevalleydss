import { Avatar, Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { getActiveIssuesPageHeaderAuroraBg } from "../../styles/activeIssues.styles";
import { resolveActiveIssuesToneColor } from "../../utils/activeIssues.meta";

/**
 * Tarjeta de métrica compacta usada en cabeceras y paneles
 * del módulo de issues activos.
 *
 * @param {Object} props Props del componente.
 * @param {*} props.icon Icono mostrado.
 * @param {string} props.label Etiqueta visible.
 * @param {string|number} props.value Valor mostrado.
 * @param {string} props.tone Tono visual.
 * @returns {JSX.Element}
 */
const ActiveIssuesTinyStat = ({ icon, label, value, tone = "info" }) => {
  const theme = useTheme();
  const colors = resolveActiveIssuesToneColor(tone);

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 1.15,
        display: "flex",
        gap: 1.2,
        alignItems: "center",
        backgroundColor: alpha(theme.palette.background.paper, 0.12),
        boxShadow: `0 12px 34px ${alpha(theme.palette.common.black, 0.06)}`,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.10)",
        position: "relative",
        ...getActiveIssuesPageHeaderAuroraBg(theme),
        "&:after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
          opacity: 0.22,
        },
      }}
    >
      <Avatar
        sx={{
          width: 34,
          height: 34,
          bgcolor: alpha(colors.dot, 0.14),
          color: colors.text,
          fontWeight: 950,
          border: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {icon}
      </Avatar>

      <Stack spacing={0.1} sx={{ minWidth: 0, position: "relative", zIndex: 1 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          {label}
        </Typography>

        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 980, lineHeight: 1, whiteSpace: "nowrap" }}
        >
          {value}
        </Typography>
      </Stack>
    </Box>
  );
};

export default ActiveIssuesTinyStat;