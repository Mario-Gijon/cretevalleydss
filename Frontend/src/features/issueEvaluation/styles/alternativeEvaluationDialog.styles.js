import { alpha } from "@mui/material/styles";

/**
 * Fondo aurora usado en cabeceras de diálogos de evaluación de alternativas.
 *
 * @param {object} theme
 * @param {number} [intensity=0.16]
 * @returns {object}
 */
export const auroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1100px 520px at 12% 0%, ${alpha(
    theme.palette.info.main,
    intensity
  )}, transparent 62%),
                    radial-gradient(900px 500px at 88% 14%, ${alpha(
                      theme.palette.secondary.main,
                      intensity
                    )}, transparent 58%)`,
});

/**
 * Estilo suave para icon buttons de cierre y navegación.
 *
 * @param {object} theme
 * @returns {object}
 */
export const softIconBtnSx = (theme) => ({
  borderRadius: 3,
  border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
  bgcolor: alpha(theme.palette.common.white, 0.05),
  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.08) },
});
