import { alpha } from "@mui/material/styles";

/**
 * Estilo de la superficie de cabecera del catálogo educativo.
 *
 * @param {object} theme Tema activo de MUI.
 * @returns {object}
 */
export const getModelsHeaderSx = (theme) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.16),
  backgroundClip: "padding-box",
  backgroundImage: `radial-gradient(1080px 360px at 8% 0%, ${alpha(
    theme.palette.info.main,
    0.16
  )}, transparent 62%)`,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.1)}`,
});

/**
 * Estilo de una tarjeta de modelo del catálogo educativo.
 *
 * @param {object} theme Tema activo de MUI.
 * @returns {object}
 */
export const getModelCardSx = (theme) => ({
  height: "100%",
  overflow: "hidden",
  borderRadius: 3,
  backgroundColor: alpha(theme.palette.background.paper, 0.12),
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: `0 12px 34px ${alpha(theme.palette.common.black, 0.1)}`,
  transition: "border-color 160ms ease, background-color 160ms ease, transform 160ms ease",
  "&:hover": {
    backgroundColor: alpha(theme.palette.background.paper, 0.17),
    borderColor: alpha(theme.palette.secondary.main, 0.38),
    transform: "translateY(-2px)",
  },
  "&:focus-within": {
    borderColor: alpha(theme.palette.secondary.main, 0.55),
  },
});
