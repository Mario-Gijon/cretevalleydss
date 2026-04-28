import { alpha } from "@mui/material/styles";

import { getActiveIssuesHeaderGlassSx as glassSxBase } from "../../../activeIssues/styles/activeIssues.styles";

/**
 * Formatea valores numéricos de peso con truncado estable.
 *
 * @param {*} value
 * @returns {string}
 */
export const formatWeightValue = (value) => {
  if (value == null || value === "") return "—";

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);

  const raw = String(num);

  if (raw.includes("e") || raw.includes("E")) {
    const fixed = num.toFixed(6).replace(/\.?0+$/, "");
    const [intPart, decPart = ""] = fixed.split(".");
    if (!decPart) return intPart;
    if (decPart.length <= 2) return fixed;
    return `${intPart}.${decPart.slice(0, 2)}...`;
  }

  const [intPart, decPart = ""] = raw.split(".");
  if (!decPart) return intPart;
  if (decPart.length <= 2) return raw;

  return `${intPart}.${decPart.slice(0, 2)}...`;
};

/**
 * Normaliza texto para filtros.
 *
 * @param {*} value
 * @returns {string}
 */
export const normalize = (value) => String(value ?? "").toLowerCase().trim();

/**
 * Formatea fecha y hora para mostrar en paneles de admin.
 *
 * @param {*} value
 * @returns {string}
 */
export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

/**
 * Color de acento por tono para la seccion de issues.
 *
 * @param {object} theme
 * @param {string} tone
 * @returns {string}
 */
export const toneColor = (theme, tone) => {
  if (tone === "success") return theme.palette.success.main;
  if (tone === "warning") return theme.palette.warning.main;
  if (tone === "error") return theme.palette.error.main;
  if (tone === "secondary") return theme.palette.secondary.main;
  return theme.palette.info.main;
};

/**
 * Estilo pill para chips de metadatos en issues.
 *
 * @param {object} theme
 * @param {string} tone
 * @returns {object}
 */
export const pillSx = (theme, tone = "info") => {
  const color = toneColor(theme, tone);
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
 * Panel principal de la seccion de issues.
 *
 * @param {object} theme
 * @returns {object}
 */
export const sectionPanelSx = (theme) => ({
  borderRadius: 4,
  position: "relative",
  overflow: "hidden",
  ...glassSxBase(theme, 0.2, "crystal"),
  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.1)}, transparent 55%)`,
    opacity: 0.18,
  },
});

/**
 * Estilo base para cards de detalle de issue.
 *
 * @param {object} theme
 * @returns {object}
 */
export const detailCardSx = (theme) => ({
  borderRadius: 4,
  p: 1.35,
  bgcolor: alpha(theme.palette.common.white, 0.04),
  border: "1px solid rgba(255,255,255,0.08)",
});

/**
 * Etiqueta legible del estado actual de un issue.
 *
 * @param {object} issue
 * @returns {string}
 */
export const prettyStage = (issue) =>
  issue?.currentStageMeta?.label ||
  issue?.currentStageMeta?.key ||
  issue?.currentStage ||
  "—";

/**
 * Tono visual del estado de un issue.
 *
 * @param {string} stageKey
 * @returns {string}
 */
export const stageTone = (stageKey) => {
  if (stageKey === "finished") return "success";
  if (stageKey === "weightsFinished") return "warning";
  if (stageKey === "criteriaWeighting") return "info";
  if (stageKey === "alternativeEvaluation") return "info";
  return "secondary";
};

/**
 * Tono visual del porcentaje de progreso.
 *
 * @param {number} pct
 * @returns {string}
 */
export const getProgressTone = (pct) => {
  if (pct >= 100) return "success";
  if (pct > 0) return "warning";
  return "info";
};

/**
 * Asegura un array para evitar checks repetidos.
 *
 * @param {*} value
 * @returns {Array}
 */
export const safeArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Selecciona un experto inicial para la vista de progreso.
 *
 * @param {Array} rows
 * @returns {string}
 */
export const pickInitialExpertId = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return "";

  const acceptedCurrent = rows.find(
    (row) => row?.currentParticipant && row?.invitationStatus === "accepted"
  );
  if (acceptedCurrent?.expert?.id) return acceptedCurrent.expert.id;

  const current = rows.find((row) => row?.currentParticipant);
  if (current?.expert?.id) return current.expert.id;

  return rows[0]?.expert?.id || "";
};

/**
 * Tooltip para una celda de evaluacion.
 *
 * @param {*} cell
 * @returns {string}
 */
export const getCellTooltip = (cell) => {
  if (!cell || typeof cell !== "object") return "";
  const parts = [];

  if (cell?.domain?.name) parts.push(`Domain: ${cell.domain.name}`);
  if (cell?.consensusPhase != null) parts.push(`Phase: ${cell.consensusPhase}`);
  if (cell?.timestamp) parts.push(`Saved: ${formatDateTime(cell.timestamp)}`);

  return parts.join(" · ");
};

/**
 * Object.entries seguro cuando el valor puede no ser objeto.
 *
 * @param {*} value
 * @returns {Array}
 */
export const objectEntriesSafe = (value) =>
  value && typeof value === "object" ? Object.entries(value) : [];

/**
 * Resumen de metadatos de lista de issues.
 *
 * @param {Array} issues
 * @returns {object}
 */
export const summarizeIssueStats = (issues = []) => {
  const total = issues.length;
  const active = issues.filter((issue) => issue?.active).length;
  const finished = issues.filter((issue) => !issue?.active).length;
  const consensus = issues.filter((issue) => issue?.isConsensus).length;
  const pairwise = issues.filter(
    (issue) => issue?.evaluationStructure === "pairwiseAlternatives"
  ).length;

  return { total, active, finished, consensus, pairwise };
};

/**
 * Formatea un valor cualquiera de matriz/evaluacion para texto.
 *
 * @param {*} value
 * @returns {string}
 */
export const formatCellValue = (value) => {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
