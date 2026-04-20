import { alpha } from "@mui/material/styles";

/**
 * Devuelve el fondo aurora del contenedor principal.
 *
 * @param {Object} theme Tema de MUI.
 * @param {number} intensity Intensidad del degradado.
 * @returns {Object}
 */
const getCreateIssueAuroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1100px 520px at 12% 0%, ${alpha(
    theme.palette.info.main,
    intensity
  )}, transparent 62%)`,
});

/**
 * Estilos del icono superior del flujo.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueSoftIconSx = (theme) => ({
  width: 44,
  height: 44,
  bgcolor: alpha(theme.palette.info.main, 0.12),
  color: "info.main",
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
});

/**
 * Estilos del contenedor principal glass del flujo.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueShellSx = (theme) => ({
  width: "100%",
  maxWidth: 1300,
  borderRadius: 5,
  overflow: "hidden",
  position: "relative",

  backgroundColor: alpha(theme.palette.background.paper, 0.10),
  ...getCreateIssueAuroraBg(theme, 0.12),
  backdropFilter: "blur(16px)",

  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  boxShadow: `0 18px 60px ${alpha(theme.palette.common.black, 0.12)}`,
  pb:1,

  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 46%)`,
    opacity: 0.18,
    zIndex: 0,
  },

  "& > *": { position: "relative", zIndex: 1 },
});

/**
 * Estilos de la cabecera del flujo.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueHeaderSx = (theme) => ({
  ...getCreateIssueAuroraBg(theme, 0.10),
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
  px: { xs: 1.8, sm: 2.2 },
  py: { xs: 1.6, sm: 1.9 },
});

/**
 * Estilos del bloque que envuelve el stepper.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueStepperWrapSx = (theme) => ({
  px: { xs: 1.2, sm: 2.0 },
  py: { xs: 1.2, sm: 1.4 },
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  bgcolor: alpha(theme.palette.common.white, 0.015),
});

/**
 * Estilos del contenido central del wizard.
 *
 * @type {Object}
 */
export const contentSx = {
  px: { xs: 0.5, sm: 1.2, md: 1.8 },
  py: { xs: 0.6, sm: 1.0, md: 1.6 },
};

/**
 * Estilos del footer con navegación del wizard.
 *
 * @returns {Object}
 */
export const getCreateIssueFooterSx = () => ({
  px: { xs: 1.5, sm: 2.2 },
  py: 1.6,
  pt: 5,
});

/**
 * Estilos del stepper móvil con dots.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueMobileStepperSx = (theme) => ({
  display: { xs: "flex", sm: "none" },
  flexGrow: 1,
  bgcolor: "transparent",
  alignItems: "center",
  "& .MuiMobileStepper-dots": { mx: 1 },
  "& .MuiMobileStepper-dot": { bgcolor: alpha(theme.palette.common.white, 0.25) },
  "& .MuiMobileStepper-dotActive": { bgcolor: alpha(theme.palette.info.main, 0.75) },
});
