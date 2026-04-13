import { alpha } from "@mui/material/styles";

/**
 * Devuelve el fondo aurora usado en diálogos del flujo de expertos.
 *
 * @param {Object} theme Tema actual.
 * @param {number} intensity Intensidad del efecto.
 * @returns {Object}
 */
export const getIssueExpertsAuroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1100px 480px at 12% 0%, ${alpha(
    theme.palette.info.main,
    intensity
  )}, transparent 62%),
                    radial-gradient(900px 460px at 88% 16%, ${alpha(
                      theme.palette.secondary.main,
                      intensity
                    )}, transparent 58%)`,
});

/**
 * Devuelve el estilo base de panel para el flujo de expertos.
 *
 * @param {Object} theme Tema actual.
 * @param {Object} options Opciones visuales.
 * @param {number} options.bg Intensidad del fondo.
 * @returns {Object}
 */
export const getIssueExpertsPanelSx = (
  theme,
  { bg = 0.10 } = {}
) => ({
  borderRadius: 4,
  bgcolor: alpha(theme.palette.background.paper, bg),
  boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
  border: "1px solid rgba(255,255,255,0.1)",
});