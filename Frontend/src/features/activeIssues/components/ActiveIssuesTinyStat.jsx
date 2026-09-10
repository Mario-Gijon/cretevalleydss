import { Avatar, Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { resolveActiveIssuesToneColor } from "../logic/activeIssuesMeta";

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
        }}
      >
        {icon}
      </Avatar>

      <Stack spacing={0.1} sx={{ minWidth: 0 }}>
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
