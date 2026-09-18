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
 * Estilo de una sección del catálogo educativo.
 *
 * @param {object} theme Tema activo de MUI.
 * @returns {object}
 */
export const getModelCatalogSectionSx = (theme) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: 3,
  padding: { xs: 1.5, sm: 1.75, md: 2 },
  backgroundColor: alpha(theme.palette.background.paper, 0.08),
  backgroundImage: `radial-gradient(720px 220px at 0% 0%, ${alpha(
    theme.palette.secondary.main,
    0.08
  )}, transparent 68%)`,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: `0 16px 38px ${alpha(theme.palette.common.black, 0.08)}`,
});

/**
 * Estilo del encabezado de una sección del catálogo educativo.
 *
 * @param {object} theme Tema activo de MUI.
 * @returns {object}
 */
export const getModelCatalogSectionHeaderSx = (theme) => ({
  borderLeft: `3px solid ${alpha(theme.palette.secondary.main, 0.58)}`,
  paddingLeft: { xs: 1.1, sm: 1.25 },
});

/**
 * Estilo de una tarjeta de modelo del catálogo educativo.
 *
 * @param {object} theme Tema activo de MUI.
 * @returns {object}
 */
export const getModelCardSx = (theme) => ({
  position: "relative",
  height: "100%",
  overflow: "hidden",
  borderRadius: 3,
  backgroundColor: alpha(theme.palette.background.paper, 0.12),
  backgroundImage: `linear-gradient(145deg, ${alpha(
    theme.palette.common.white,
    0.045
  )}, transparent 42%), linear-gradient(320deg, ${alpha(
    theme.palette.info.main,
    0.055
  )}, transparent 58%)`,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: `0 12px 34px ${alpha(theme.palette.common.black, 0.1)}`,
  transition: "border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
  "&:hover": {
    backgroundColor: alpha(theme.palette.background.paper, 0.17),
    borderColor: alpha(theme.palette.secondary.main, 0.52),
    boxShadow: `0 16px 34px ${alpha(theme.palette.common.black, 0.16)}, 0 0 22px ${alpha(
      theme.palette.secondary.main,
      0.1
    )}`,
    transform: "translateY(-3px)",
  },
});
