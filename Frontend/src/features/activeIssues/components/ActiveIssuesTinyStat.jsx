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
 * @param {boolean} props.compact Usa una variante mas densa para contadores cortos.
 * @param {boolean} props.fullHeight Hace que la tarjeta ocupe toda la altura de su celda.
 * @param {string|ReactNode} props.mobileLabel Etiqueta alternativa para pantallas pequenas.
 * @returns {JSX.Element}
 */
const ActiveIssuesTinyStat = ({
  icon,
  label,
  value,
  tone = "info",
  compact = false,
  fullHeight = false,
  mobileLabel,
}) => {
  const theme = useTheme();
  const colors = resolveActiveIssuesToneColor(tone);

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: compact ? 0.85 : 1.15,
        display: "flex",
        gap: compact ? 0.8 : 1.2,
        alignItems: "center",
        backgroundColor: alpha(theme.palette.background.paper, 0.12),
        boxShadow: `0 12px 34px ${alpha(theme.palette.common.black, 0.06)}`,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.10)",
        ...(fullHeight ? { height: "100%" } : {}),
      }}
    >
      <Avatar
        sx={{
          width: compact ? 28 : 34,
          height: compact ? 28 : 34,
          bgcolor: alpha(colors.dot, 0.14),
          color: colors.text,
          fontWeight: 950,
          border: "1px solid rgba(255,255,255,0.06)",
          "& .MuiSvgIcon-root": {
            fontSize: compact ? 18 : undefined,
          },
        }}
      >
        {icon}
      </Avatar>

      <Stack spacing={0.1} sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          {mobileLabel ? (
            <>
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {label}
              </Box>
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                {mobileLabel}
              </Box>
            </>
          ) : (
            label
          )}
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
