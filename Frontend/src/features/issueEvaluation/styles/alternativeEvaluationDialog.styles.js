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

/**
 * Contenedor visual para bloques del diálogo.
 *
 * @param {object} theme
 * @returns {object}
 */
export const sectionSx = (theme) => ({
  borderRadius: 4,
  bgcolor: alpha(theme.palette.common.white, 0.03),
  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
});

/**
 * Tabs tipo pill usadas en evaluación pairwise.
 *
 * @param {object} theme
 * @returns {object}
 */
export const pillTabsSx = (theme) => ({
  width: "100%",
  "& .MuiTabs-flexContainer": { gap: 8, padding: 6 },
  "& .MuiTabs-indicator": { display: "none" },
  "& .MuiTab-root": {
    textTransform: "none",
    fontWeight: 900,
    borderRadius: 999,
    minHeight: 36,
    minWidth: 120,
    paddingInline: 14,
    border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
    bgcolor: alpha(theme.palette.common.white, 0.03),
    color: theme.palette.text.secondary,
  },
  "& .MuiTab-root.Mui-selected": {
    color: theme.palette.info.main,
    borderColor: alpha(theme.palette.info.main, 0.35),
    bgcolor: alpha(theme.palette.info.main, 0.12),
  },
});

/**
 * Chip de metadata usado en evaluación pairwise.
 *
 * @param {object} theme
 * @returns {object}
 */
export const metaChipSx = (theme) => ({
  borderRadius: 999,
  bgcolor: alpha(theme.palette.common.white, 0.04),
  borderColor: alpha(theme.palette.common.white, 0.08),
  "& .MuiChip-label": { fontWeight: 850 },
});