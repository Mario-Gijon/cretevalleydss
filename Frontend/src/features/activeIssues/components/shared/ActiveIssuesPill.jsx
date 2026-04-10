import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { resolveActiveIssuesToneColor } from "../../utils/activeIssues.meta";

/**
 * Indicador visual circular usado dentro de la pill.
 *
 * @param {Object} props Props del componente.
 * @param {string} props.tone Tono visual.
 * @returns {JSX.Element}
 */
const PillDot = ({ tone = "info" }) => {
  const colors = resolveActiveIssuesToneColor(tone);

  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        bgcolor: colors.dot,
        flex: "0 0 auto",
      }}
    />
  );
};

/**
 * Badge compacto usado para resaltar estados cortos
 * dentro del módulo de issues activos.
 *
 * @param {Object} props Props del componente.
 * @param {string} props.tone Tono visual.
 * @param {*} props.children Contenido visible.
 * @returns {JSX.Element}
 */
const ActiveIssuesPill = ({ tone = "info", children }) => {
  const theme = useTheme();
  const colors = resolveActiveIssuesToneColor(tone);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.2,
        py: 0.55,
        borderRadius: 999,
        bgcolor: alpha(colors.dot, 0.12),
        color: colors.text,
        fontSize: 12,
        fontWeight: 950,
        width: "fit-content",
        boxShadow: `0 10px 26px ${alpha(theme.palette.common.black, 0.06)}`,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <PillDot tone={tone} />
      <span>{children}</span>
    </Box>
  );
};

export default ActiveIssuesPill;