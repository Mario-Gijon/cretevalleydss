import { alpha } from "@mui/material/styles";

/**
 * Fondo aurora usado en contenedores del dialogo.
 *
 * @param {Object} theme Tema activo de Material UI.
 * @param {number} intensity Intensidad del degradado.
 * @returns {Object}
 */
export const getFinishedIssueDialogAuroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1200px 520px at 12% 0%, ${alpha(
    theme.palette.info.main,
    intensity
  )}, transparent 62%),
                    radial-gradient(900px 460px at 0% 0%, ${alpha(
    theme.palette.secondary.main,
    intensity
  )}, transparent 58%)`,
});

/**
 * Borde cristal reutilizable en paneles del dialogo.
 *
 * @returns {Object}
 */
export const getFinishedIssueDialogCrystalBorder = () => ({
  border: "1px solid rgba(255,255,255,0.10)",
});

/**
 * Estilo glass base para cards internas del dialogo.
 *
 * @param {Object} theme Tema activo de Material UI.
 * @returns {Object}
 */
export const getFinishedIssueDialogGlassSx = (theme) => ({
  backgroundColor: alpha("#050e22", 0.3),
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.14)}`,
  ...getFinishedIssueDialogCrystalBorder(),
});

/**
 * Plantilla de areas para el grid principal del dialogo.
 *
 * @param {boolean} isMdUp Indica si se usa layout de escritorio.
 * @param {boolean} hasModelSpecificOutput Indica si se muestra el bloque de output del modelo.
 * @returns {string}
 */
export const getFinishedIssueDialogGridAreas = (
  isMdUp,
  hasModelSpecificOutput = false
) =>
  isMdUp
    ? `
        "summary ranking"
        "analysis analysis"
        "models models"
        "graphs graphs"
        "ratings ratings"
        ${hasModelSpecificOutput ? '"modelSpecificOutput modelSpecificOutput"' : ""}
      `
    : `
        "summary"
        "ranking"
        "analysis"
        "models"
        "graphs"
        "ratings"
        ${hasModelSpecificOutput ? '"modelSpecificOutput"' : ""}
      `;