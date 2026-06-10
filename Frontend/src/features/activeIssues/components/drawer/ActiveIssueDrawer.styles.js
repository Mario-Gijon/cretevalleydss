import { alpha } from "@mui/material/styles";

/**
 * Devuelve el borde translúcido usado en el header del drawer.
 *
 * @returns {Object}
 */
export const getIssueDetailsDrawerCrystalBorder = () => {
  return { border: "1px solid rgba(117, 199, 209, 0.8)" };
};

/**
 * Devuelve el estilo base de los paneles internos del drawer.
 *
 * @param {Object} theme Tema actual.
 * @param {Object} options Opciones visuales.
 * @param {number} options.bg Intensidad del fondo.
 * @returns {Object}
 */
export const getIssueDetailsDrawerPanelSx = (
  theme,
  { bg = 0.10 } = {}
) => ({
  borderRadius: 4,
  bgcolor: alpha(theme.palette.background.paper, bg),
  boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
  border: "1px solid rgba(255,255,255,0.1)",
});
