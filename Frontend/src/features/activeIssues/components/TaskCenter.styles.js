import { alpha } from "@mui/material/styles";

/**
 * Devuelve el borde translúcido base del task center.
 *
 * @returns {Object}
 */
export const getTaskCenterBorderSx = () => ({
  border: "1px solid rgba(109, 109, 109, 0.29)",
});

/**
 * Devuelve el estilo glass del contenedor del task center.
 *
 * @param {Object} theme Tema actual.
 * @returns {Object}
 */
export const getTaskCenterGlassSx = (theme) => ({
  bgcolor: "transparent",
  backdropFilter: "blur(12px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
  ...getTaskCenterBorderSx(),
});

/**
 * Oculta la barra de scroll horizontal manteniendo el desplazamiento.
 */
export const taskCenterHideScrollbarXSx = {
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { height: 0 },
};

/**
 * Devuelve el estilo del contenedor scrollable vertical del panel.
 *
 * @param {Object} theme Tema actual.
 * @returns {Object}
 */
export const getTaskCenterScrollbarSx = (theme) => ({
  scrollbarWidth: "thin",
  scrollbarColor: `${alpha(theme.palette.text.primary, 0.22)} transparent`,
  "&::-webkit-scrollbar": { width: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(theme.palette.text.primary, 0.18),
    borderRadius: 999,
    border: "2px solid transparent",
    backgroundClip: "content-box",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: alpha(theme.palette.text.primary, 0.28),
  },
});