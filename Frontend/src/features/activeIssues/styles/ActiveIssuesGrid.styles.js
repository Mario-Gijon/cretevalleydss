import { alpha, styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";

/**
 * Tarjeta base del grid de issues.
 */
export const IssuesGridCard = styled(Paper)(({ theme }) => ({
  borderRadius: 10,
  height: "100%",
  transition:
    "transform 160ms ease, box-shadow 160ms ease, background 220ms ease, border-color 220ms ease",
  background: "#0d202d",
  color: theme.palette.common.white,
  boxShadow: "none",
  border: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
    background: "#102838",
    borderColor: "rgba(76,201,211,0.28)",
  },
}));

/**
 * Altura fija usada por las cards del grid.
 */
export const ISSUES_GRID_CARD_HEIGHT = 262;

/**
 * Devuelve el color de la barra de deadline según el progreso.
 *
 * @param {Object} theme Tema actual.
 * @param {number} progress Progreso normalizado.
 * @returns {string}
 */
export const getIssueDeadlineColorByProgress = (theme, progress) => {
  if (progress < 0.25) return alpha(theme.palette.info.main, 0.95);
  if (progress < 0.5) return alpha(theme.palette.success.main, 0.95);
  if (progress < 0.7) return alpha(theme.palette.warning.light, 0.95);
  if (progress < 0.85) return alpha(theme.palette.warning.main, 0.95);

  return alpha(theme.palette.error.main, 0.95);
};

/**
 * Oculta la barra de scroll horizontal del stepper.
 */
export const issuesGridHideScrollbarSx = {
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { height: 0 },
};
