import { alpha } from "@mui/material/styles";

/**
 * Devuelve el fondo decorativo general del módulo
 * de issues activos.
 *
 * @param {Object} theme Tema actual de MUI.
 * @param {number} intensity Intensidad del efecto visual.
 * @returns {Object}
 */
export const getActiveIssuesAuroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1100px 480px at 12% 0%, ${alpha(theme.palette.info.main, intensity)}, transparent 62%),
                    radial-gradient(900px 460px at 88% 16%, ${alpha(theme.palette.secondary.main, intensity)}, transparent 58%)`,
});

/**
 * Devuelve el borde inferior translúcido usado en
 * superficies tipo header del módulo.
 *
 * @returns {Object}
 */
const getActiveIssuesHeaderBorder = () => ({
  borderBottom: "2px solid rgba(155, 192, 197, 0.25)",
});

/**
 * Devuelve el estilo glass usado por superficies tipo header.
 *
 * @param {Object} theme Tema actual de MUI.
 * @param {number} strength Intensidad del fondo.
 * @returns {Object}
 */
export const getActiveIssuesHeaderGlassSx = (theme, strength = 0.14) => ({
  backgroundColor: alpha(theme.palette.background.paper, strength),
  backdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
  ...getActiveIssuesHeaderBorder(),
});

/**
 * Devuelve el borde translúcido usado en paneles del módulo.
 *
 * @returns {Object}
 */
const getActiveIssuesPanelBorder = () => ({
  border: "1px solid rgba(117, 198, 209, 0.24)",
});

/**
 * Devuelve el estilo glass reutilizable para paneles
 * del módulo de issues activos.
 *
 * @param {Object} theme Tema actual de MUI.
 * @param {number} strength Intensidad del fondo.
 * @returns {Object}
 */
export const getActiveIssuesPanelGlassSx = (theme, strength = 0.14) => ({
  backgroundColor: alpha(theme.palette.background.paper, strength),
  backdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
  ...getActiveIssuesAuroraBg(theme, 0.16),
  ...getActiveIssuesPanelBorder(),
  borderBottom: "2px solid rgba(155, 192, 197, 0.25)",
  
});
/**
 * Devuelve el fondo aurora exacto usado originalmente
 * en la cabecera de ActiveIssuesPage.
 *
 * Mantiene el mismo alpha fijo que tenía el helper
 * exportado desde ActiveIssuesHeader.
 *
 * @param {Object} theme Tema actual de MUI.
 * @returns {Object}
 */
export const getActiveIssuesPageHeaderAuroraBg = (theme) => ({
  backgroundImage: `radial-gradient(1680px 520px at 5% 10%, ${alpha(theme.palette.info.main, 0.25)}, transparent 62%)`,
});

/**
 * Devuelve el estilo glass exacto del bloque superior
 * desktop de ActiveIssuesPage.
 *
 * Replica el antiguo headerGlassSx usado por la página.
 *
 * @param {Object} theme Tema actual de MUI.
 * @param {number} strength Intensidad del fondo.
 * @returns {Object}
 */
export const getActiveIssuesPageHeaderGlassSx = (theme, strength = 0.16) => ({
  backgroundColor: alpha(theme.palette.background.paper, strength),
  backdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
  borderBottom: "2px solid rgba(155, 192, 197, 0.25)",
});

/**
 * Devuelve el estilo glass exacto del accordion mobile
 * de tareas de ActiveIssuesPage.
 *
 * Replica el antiguo glassSx local del page, que tenía
 * borde completo y aurora de fondo.
 *
 * @param {Object} theme Tema actual de MUI.
 * @param {number} strength Intensidad del fondo.
 * @returns {Object}
 */
export const getActiveIssuesTasksAccordionGlassSx = (theme, strength = 0.16) => ({
  backgroundColor: alpha(theme.palette.background.paper, strength),
  ...getActiveIssuesPageHeaderAuroraBg(theme),
  backdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
  border: "1px solid rgba(117, 198, 209, 0.24)",
});