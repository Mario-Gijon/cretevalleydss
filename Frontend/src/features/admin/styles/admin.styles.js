import { alpha } from "@mui/material/styles";
import {
  getActiveIssuesHeaderGlassSx as glassSxBase,
} from "../../activeIssues/styles/activeIssues.styles";

/**
 * Color de acento por tono para secciones admin.
 *
 * @param {object} theme
 * @param {string} tone
 * @returns {string}
 */
export const getAdminToneColor = (theme, tone) => {
  if (tone === "warning") return theme.palette.warning.main;
  if (tone === "success") return theme.palette.success.main;
  if (tone === "error") return theme.palette.error.main;
  return theme.palette.info.main;
};

/**
 * Estilos para chips de metadatos del admin.
 *
 * @param {object} theme
 * @param {string} tone
 * @returns {object}
 */
export const getAdminTagSx = (theme, tone = "info") => {
  const color = getAdminToneColor(theme, tone);

  return {
    height: 26,
    borderRadius: 999,
    fontWeight: 950,
    bgcolor: alpha(color, 0.1),
    borderColor: alpha(color, 0.25),
    color: "text.secondary",
  };
};

/**
 * Estilos del panel principal y cabeceras de admin.
 *
 * @param {object} theme
 * @param {number} strength
 * @returns {object}
 */
export const getAdminPanelSx = (theme, strength = 0.14) => ({
  borderRadius: 5,
  position: "relative",
  overflow: "hidden",
  ...glassSxBase(theme, strength, "crystal"),
  backgroundImage: `radial-gradient(1100px 480px at 12% 0%, ${alpha(theme.palette.info.main, 0.12)}, transparent 62%),
                    radial-gradient(0px 0px at 88% 16%, ${alpha(theme.palette.secondary.main, 0.12)}, transparent 58%)`,
  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.1)}, transparent 55%)`,
    opacity: 0.2,
  },
});

/**
 * Estilos de tarjetas de acceso a seccion admin.
 *
 * @param {object} theme
 * @returns {object}
 */
export const getAdminSectionCardSx = (theme) => ({
  borderRadius: 5,
  height: "100%",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  transition: "transform 160ms ease, box-shadow 160ms ease, border-color 220ms ease, background 220ms ease",
  ...glassSxBase(theme, 0.12, "crystal"),
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: `0 20px 54px ${alpha(theme.palette.common.black, 0.14)}`,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: alpha(theme.palette.background.paper, 0.16),
  },
});
