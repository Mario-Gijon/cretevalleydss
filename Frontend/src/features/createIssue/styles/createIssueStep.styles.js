import { alpha } from "@mui/material/styles";

/**
 * Estilo base para contenedores de step dentro del flujo createIssue.
 *
 * @type {Object}
 */
export const createIssueStepContainerSx = {
  width: "100%",
  maxWidth: 1250,
  mx: "auto",
  minHeight: 0,
};

/**
 * Estilo base para inputs de steps createIssue.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueStepInputSx = (theme) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    bgcolor: alpha(theme.palette.common.white, 0.04),
  },
});

/**
 * Estilo del paper para diálogos compactos del flujo createIssue.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueCompactDialogPaperSx = (theme) => ({
  borderRadius: 3.4,
  overflow: "hidden",
  border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
  boxShadow: `0 24px 60px ${alpha(theme.palette.common.black, 0.20)}`,
  background: `radial-gradient(900px 340px at 10% 0%, ${alpha(
    theme.palette.info.main,
    0.18
  )}, transparent 62%), rgba(16, 24, 34, 0.92)`,
});

/**
 * Estilo de paper para diálogos simples con aurora sutil en la parte superior.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueSoftTopAuroraDialogPaperSx = (theme) => ({
  borderRadius: 3.2,
  overflow: "hidden",
  border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
  boxShadow: `0 20px 52px ${alpha(theme.palette.common.black, 0.20)}`,
  background: `radial-gradient(860px 150px at 50% 0%, ${alpha(
    theme.palette.info.main,
    0.12
  )}, transparent 58%), rgba(16, 24, 34, 0.92)`,
});

/**
 * Estilo de título para diálogos compactos del flujo createIssue.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueCompactDialogTitleSx = (theme) => ({
  fontWeight: 900,
  pb: 1,
  background: `linear-gradient(180deg, ${alpha(theme.palette.info.main, 0.12)} 0%, ${alpha(
    theme.palette.info.main,
    0.04
  )} 100%)`,
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.09)}`,
});

/**
 * Estilo de contenido para diálogos compactos del flujo createIssue.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueCompactDialogContentSx = (theme) => ({
  pt: 1.1,
  pb: 0.9,
  "&:last-child": { pb: 1.2 },
  bgcolor: alpha(theme.palette.common.white, 0.008),
});

/**
 * Estilo de acciones para diálogos compactos del flujo createIssue.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueCompactDialogActionsSx = (theme) => ({
  px: 2,
  py: 1,
  gap: 1,
  borderTop: `1px solid ${alpha(theme.palette.common.white, 0.03)}`,
  bgcolor: alpha(theme.palette.info.main, 0.03),
});

/**
 * Estilo base para listas/tabla scrollables del flujo createIssue.
 *
 * @param {Object} theme Tema de MUI.
 * @param {string} maxHeight Alto máximo.
 * @returns {Object}
 */
export const getCreateIssueStepScrollableSx = (theme, maxHeight = "52vh") => ({
  maxHeight,
  borderRadius: 4,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  bgcolor: alpha(theme.palette.common.white, 0.02),
  overflow: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: `${alpha(theme.palette.common.white, 0.22)} transparent`,
  "&::-webkit-scrollbar": { width: 8, height: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(theme.palette.common.white, 0.16),
    borderRadius: 999,
    border: "2px solid transparent",
    backgroundClip: "content-box",
  },
  "&::-webkit-scrollbar-thumb:hover": { backgroundColor: alpha(theme.palette.common.white, 0.24) },
});

/**
 * Estilo de estado vacío para listas de steps.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueStepEmptyStateSx = (theme) => ({
  mt: 0.5,
  borderRadius: 4,
  border: `1px dashed ${alpha(theme.palette.common.white, 0.14)}`,
  bgcolor: alpha(theme.palette.common.white, 0.015),
  p: 2,
});

/**
 * Estilo de divisor de filas para listas createIssue.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueRowDividerSx = (theme) => ({
  borderColor: alpha(theme.palette.common.white, 0.07),
});

/**
 * Estilo del toggle de filtro de consenso en selección de modelo.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueModelPillToggleSx = (theme) => ({
  borderRadius: 999,
  px: 1.4,
  py: 0.7,
  fontWeight: 950,
  textTransform: "none",
  borderColor: alpha(theme.palette.common.white, 0.14),
  bgcolor: alpha(theme.palette.common.white, 0.03),
  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.05) },
  "&.Mui-selected": {
    borderColor: alpha(theme.palette.secondary.main, 0.35),
    bgcolor: alpha(theme.palette.secondary.main, 0.12),
  },
});

/**
 * Estilo de cada tarjeta de modelo.
 *
 * @param {Object} theme Tema de MUI.
 * @param {boolean} selected Si está seleccionado.
 * @returns {Object}
 */
export const getCreateIssueModelTileSx = (theme, selected) => ({
  position: "relative",
  borderRadius: 4,
  p: 1.6,
  height: "100%",
  cursor: "pointer",
  border: `1px solid ${
    selected
      ? alpha(theme.palette.info.main, 0.4)
      : alpha(theme.palette.common.white, 0.1)
  }`,
  bgcolor: selected
    ? alpha(theme.palette.info.main, 0.1)
    : alpha(theme.palette.common.white, 0.02),
  transition: "transform 120ms ease, border-color 120ms ease, background 120ms ease",
  "&:hover": {
    transform: "translateY(-2px)",
    borderColor: alpha(theme.palette.info.main, 0.3),
    bgcolor: alpha(theme.palette.common.white, 0.03),
  },
});

/**
 * Estilo del badge de modelo seleccionado.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueModelSelectedBadgeSx = (theme) => ({
  position: "absolute",
  top: 10,
  right: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 0.6,
  px: 1,
  borderRadius: 999,
  border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
  bgcolor: alpha(theme.palette.info.main, 0.12),
  color: "info.main",
  fontWeight: 950,
  fontSize: 12,
});

/**
 * Estilo del avatar de cabecera en step de expertos.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsHeaderAvatarSx = (theme) => ({
  width: 44,
  height: 44,
  bgcolor: alpha(theme.palette.info.main, 0.12),
  color: "info.main",
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
});

/**
 * Estilo del badge contador en step de expertos.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsCountBadgeSx = (theme) => ({
  px: 1.1,
  py: 0.55,
  borderRadius: 999,
  bgcolor: alpha(theme.palette.info.main, 0.1),
  color: "info.main",
  fontSize: 12,
  fontWeight: 950,
  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
});

/**
 * Estilo de input de búsqueda en step de expertos.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsSearchInputSx = (theme) => ({
  "& .MuiOutlinedInput-root": {
    bgcolor: alpha(theme.palette.common.white, 0.04),
    borderRadius: 3,
  },
});

/**
 * Estilo de chip para expertos seleccionados.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsChipSx = (theme) => ({
  borderColor: alpha(theme.palette.common.white, 0.18),
  color: alpha(theme.palette.common.white, 0.88),
  bgcolor: alpha(theme.palette.common.white, 0.03),
  "& .MuiChip-deleteIcon": { color: alpha(theme.palette.common.white, 0.55) },
  "& .MuiChip-deleteIcon:hover": { color: alpha(theme.palette.common.white, 0.85) },
});

/**
 * Estilo del contenedor scrollable para expertos seleccionados.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsSelectedListSx = (theme) => ({
  ...getCreateIssueStepScrollableSx(theme, "220px"),
  maxHeight: {
    xs: 200,
    md: 380,
    lg: 400,
  },
  px: 0,
  py: 0,
});

/**
 * Estilo de fila compacta para expertos seleccionados.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsSelectedRowSx = (theme) => ({
  px: 1,
  py: 0.7,
  borderRadius: 0,
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.07)}`,
  bgcolor: "transparent",
  "&:hover": {
    bgcolor: alpha(theme.palette.info.main, 0.05),
  },
  "&:last-of-type": {
    borderBottomColor: "transparent",
  },
});

/**
 * Estilo de celda de cabecera para tabla de expertos.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsHeadCellSx = (theme) => ({
  fontWeight: 950,
  color: alpha(theme.palette.common.white, 0.82),
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  bgcolor: "#1a2a2fcf",
  py: 1.05,
});

/**
 * Estilo de celda de cuerpo para tabla de expertos.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsBodyCellSx = (theme) => ({
  color: alpha(theme.palette.common.white, 0.9),
  fontWeight: 850,
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
  py: 1.05,
});

/**
 * Estilo de tabla scrollable para step de expertos.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsTableContainerSx = (theme) => ({
  ...getCreateIssueStepScrollableSx(theme, "52vh"),
});

/**
 * Estilo hover de fila en tabla de expertos.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpertsHoverRowSx = (theme) => ({
  "&:hover": { bgcolor: alpha(theme.palette.info.main, 0.08) },
});

/**
 * Estilo del icono de cabecera del step de dominios.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpressionHeaderIconSx = (theme) => ({
  width: 44,
  height: 44,
  bgcolor: alpha(theme.palette.info.main, 0.12),
  color: "info.main",
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
});

/**
 * Estilo de botón de acción en step de dominios.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpressionActionBtnSx = (theme) => ({
  borderRadius: 999,
  px: 1.4,
  py: 0.8,
  fontWeight: 950,
  textTransform: "none",
  borderColor: alpha(theme.palette.common.white, 0.14),
  bgcolor: alpha(theme.palette.common.white, 0.03),
  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.05) },
});

/**
 * Estilo del badge contador en dominios de expresión.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueExpressionCountBadgeSx = (theme) => ({
  px: 1.1,
  py: 0.55,
  borderRadius: 999,
  bgcolor: alpha(theme.palette.info.main, 0.1),
  color: "info.main",
  fontSize: 12,
  fontWeight: 950,
  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
});

/**
 * Estilo de accordion en resumen.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueSummaryAccordionSx = (theme) => ({
  borderRadius: 4,
  overflow: "hidden",
  bgcolor: alpha(theme.palette.common.white, 0),
  border: `1px solid ${alpha(theme.palette.common.white, 0)}`,
  boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
  "&:before": { display: "none" },
});

/**
 * Estilo de item de alternativa en resumen.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueSummaryAlternativeItemSx = (theme) => ({
  borderRadius: 3,
  px: 1.25,
  py: 0.9,
  bgcolor: alpha(theme.palette.common.white, 0.02),
  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
  "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.08) },
});

/**
 * Estilo de chip de expertos en resumen.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueSummaryExpertChipSx = (theme) => ({
  bgcolor: alpha(theme.palette.common.white, 0.02),
  borderColor: alpha(theme.palette.common.white, 0.1),
  fontWeight: 850,
});

/**
 * Estilo de tabla de dominios en resumen.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueSummaryDomainTableContainerSx = (theme) => ({
  maxHeight: "45vh",
  borderRadius: 4,
  overflow: "hidden",
  bgcolor: alpha(theme.palette.common.white, 0.02),
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
});

/**
 * Estilo de celda de cabecera de tabla de dominios en resumen.
 *
 * @param {Object} theme Tema de MUI.
 * @returns {Object}
 */
export const getCreateIssueSummaryDomainHeaderCellSx = (theme) => ({
  fontWeight: 950,
  color: "text.secondary",
  bgcolor: alpha(theme.palette.background.paper, 0.22),
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
});

/**
 * Estilo del toggle "Unlimited" en resumen.
 *
 * @param {Object} theme Tema de MUI.
 * @param {boolean} unlimited Estado de selección.
 * @returns {Object}
 */
export const getCreateIssueSummaryUnlimitedToggleSx = (theme, unlimited) => ({
  borderRadius: 999,
  px: 1.6,
  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  bgcolor: unlimited ? alpha(theme.palette.secondary.main, 0.12) : "transparent",
});
