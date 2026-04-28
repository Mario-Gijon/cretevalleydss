import { normalizeString } from "../../../utils/common/strings.js";
import { toIdString } from "../../../utils/common/ids.js";

import { WEIGHTING_MODES } from "./weightEvaluation.constants.js";

const WEIGHTING_MODES_WITH_OWN_DOCS = new Set(
  Object.values(WEIGHTING_MODES).map((mode) =>
    String(mode || "").trim().toLowerCase()
  )
);

/**
 * Normaliza el nombre del modo de pesos.
 *
 * @param {any} mode Modo de pesos.
 * @returns {string}
 */
const normalizeMode = (mode) =>
  normalizeString(mode, {
    trim: true,
    collapseWhitespace: true,
    lower: true,
  });

/**
 * Extrae una lista de ids normalizados desde una colección.
 *
 * @param {Array<any>} [items=[]] Colección de entrada.
 * @returns {Array<string>}
 */
const getEntityIds = (items = []) => {
  return items.map(toIdString).filter(Boolean);
};

/**
 * Construye un objeto con ids como claves y null como valor inicial.
 *
 * @param {Array<string>} [ids=[]] Lista de ids.
 * @returns {Object.<string, null>}
 */
const buildNullObjectFromIds = (ids = []) => {
  return Object.fromEntries(ids.map((id) => [id, null]));
};

/**
 * Indica si un modo de pesos necesita documentos propios de evaluación de pesos.
 *
 * @param {string} weightingMode Modo de pesos.
 * @returns {boolean}
 */
export const weightingModeRequiresOwnDocs = (weightingMode) => {
  return WEIGHTING_MODES_WITH_OWN_DOCS.has(normalizeMode(weightingMode));
};

/**
 * Determina si deben crearse documentos de CriteriaWeightEvaluation.
 *
 * @param {Object} params Parámetros de decisión.
 * @returns {boolean}
 */
export const shouldCreateCriteriaWeightEvaluations = ({
  leafCriteriaCount = 0,
  weightingMode = "",
}) => {
  return (
    Number(leafCriteriaCount) > 1 &&
    weightingModeRequiresOwnDocs(weightingMode)
  );
};

/**
 * Resuelve la etapa inicial del issue según criterios y modo de pesos.
 *
 * @param {Object} params Parámetros del issue.
 * @returns {string}
 */
export const resolveInitialIssueStage = ({
  leafCriteriaCount = 0,
  weightingMode = "",
}) => {
  return shouldCreateCriteriaWeightEvaluations({
    leafCriteriaCount,
    weightingMode,
  })
    ? "criteriaWeighting"
    : "alternativeEvaluation";
};

/**
 * Construye los documentos iniciales de CriteriaWeightEvaluation para un issue.
 *
 * @param {Object} params Datos necesarios para construir los pesos iniciales.
 * @returns {Array<Object>}
 */
export const buildInitialCriteriaWeightEvaluationDocs = ({
  issueId,
  experts = [],
  leafCriteria = [],
  weightingMode = "",
  consensusPhase = 1,
  completed = false,
}) => {
  const issue = toIdString(issueId);
  const expertIds = getEntityIds(experts);
  const criterionIds = getEntityIds(leafCriteria);
  const normalizedWeightingMode = normalizeMode(weightingMode);

  if (
    !issue ||
    !expertIds.length ||
    !shouldCreateCriteriaWeightEvaluations({
      leafCriteriaCount: criterionIds.length,
      weightingMode: normalizedWeightingMode,
    })
  ) {
    return [];
  }

  const docs = [];

  if (
    normalizedWeightingMode === "manual" ||
    normalizedWeightingMode === "consensus"
  ) {
    for (const expert of expertIds) {
      docs.push({
        issue,
        expert,
        completed,
        consensusPhase,
        weightingMode: normalizedWeightingMode,
        manualWeights: buildNullObjectFromIds(criterionIds),
      });
    }

    return docs;
  }

  if (
    normalizedWeightingMode === "bwm" ||
    normalizedWeightingMode === "consensusbwm" ||
    normalizedWeightingMode === "simulatedconsensusbwm"
  ) {
    for (const expert of expertIds) {
      docs.push({
        issue,
        expert,
        completed,
        consensusPhase,
        weightingMode: normalizedWeightingMode,
        bestCriterion: null,
        worstCriterion: null,
        bestToOthers: buildNullObjectFromIds(criterionIds),
        othersToWorst: buildNullObjectFromIds(criterionIds),
      });
    }
  }

  return docs;
};
