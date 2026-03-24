import { normalizeString } from "../../utils/common/strings.js";
import { toIdString } from "../../utils/common/ids.js";

const WEIGHTING_MODES_WITH_OWN_DOCS = new Set([
  "manual",
  "consensus",
  "bwm",
  "consensusbwm",
  "simulatedconsensusbwm",
]);

export const EVALUATION_STRUCTURES = {
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
};

/**
 * Resuelve la estructura de evaluación de un documento, manteniendo compatibilidad
 * con el campo antiguo isPairwise.
 *
 * @param {Record<string, any> | null | undefined} doc Documento a inspeccionar.
 * @returns {string}
 */
export const resolveEvaluationStructure = (doc) => {
  if (doc?.evaluationStructure) {
    return doc.evaluationStructure;
  }

  if (doc?.isPairwise === true) {
    return EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;
  }

  return EVALUATION_STRUCTURES.DIRECT;
};

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
 * @returns {Record<string, null>}
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
 * @param {{
 *   leafCriteriaCount?: number,
 *   weightingMode?: string
 * }} params Parámetros de decisión.
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
 * @param {{
 *   leafCriteriaCount?: number,
 *   weightingMode?: string
 * }} params Parámetros del issue.
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
 * Construye los pares de comparación entre alternativas.
 *
 * @param {Array<any>} [alternatives=[]] Alternativas del issue.
 * @param {{ includeReciprocal?: boolean }} [options={}] Opciones de construcción.
 * @returns {Array<{ alternative: string, comparedAlternative: string }>}
 */
export const buildAlternativeComparisonPairs = (
  alternatives = [],
  { includeReciprocal = false } = {}
) => {
  const alternativeIds = getEntityIds(alternatives);
  const pairs = [];

  for (let i = 0; i < alternativeIds.length; i += 1) {
    for (let j = i + 1; j < alternativeIds.length; j += 1) {
      pairs.push({
        alternative: alternativeIds[i],
        comparedAlternative: alternativeIds[j],
      });

      if (includeReciprocal) {
        pairs.push({
          alternative: alternativeIds[j],
          comparedAlternative: alternativeIds[i],
        });
      }
    }
  }

  return pairs;
};

/**
 * Construye los documentos iniciales de Evaluation para un issue.
 *
 * @param {{
 *   issueId: any,
 *   experts?: Array<any>,
 *   leafCriteria?: Array<any>,
 *   alternatives?: Array<any>,
 *   isPairwise?: boolean,
 *   consensusPhase?: number,
 *   includeReciprocal?: boolean
 * }} params Datos necesarios para construir las evaluaciones.
 * @returns {Array<Record<string, any>>}
 */
export const buildInitialEvaluationDocs = ({
  issueId,
  experts = [],
  leafCriteria = [],
  alternatives = [],
  isPairwise = false,
  consensusPhase = 1,
  includeReciprocal = false,
}) => {
  const issue = toIdString(issueId);
  const expertIds = getEntityIds(experts);
  const criterionIds = getEntityIds(leafCriteria);
  const alternativeIds = getEntityIds(alternatives);

  if (!issue || !expertIds.length || !criterionIds.length || !alternativeIds.length) {
    return [];
  }

  const docs = [];

  if (isPairwise) {
    const alternativePairs = buildAlternativeComparisonPairs(alternatives, {
      includeReciprocal,
    });

    for (const expert of expertIds) {
      for (const criterion of criterionIds) {
        for (const pair of alternativePairs) {
          docs.push({
            issue,
            expert,
            criterion,
            alternative: pair.alternative,
            comparedAlternative: pair.comparedAlternative,
            completed: false,
            consensusPhase,
          });
        }
      }
    }

    return docs;
  }

  for (const expert of expertIds) {
    for (const criterion of criterionIds) {
      for (const alternative of alternativeIds) {
        docs.push({
          issue,
          expert,
          criterion,
          alternative,
          comparedAlternative: null,
          completed: false,
          consensusPhase,
        });
      }
    }
  }

  return docs;
};

/**
 * Construye los documentos iniciales de CriteriaWeightEvaluation para un issue.
 *
 * @param {{
 *   issueId: any,
 *   experts?: Array<any>,
 *   leafCriteria?: Array<any>,
 *   weightingMode?: string,
 *   consensusPhase?: number,
 *   completed?: boolean
 * }} params Datos necesarios para construir los pesos iniciales.
 * @returns {Array<Record<string, any>>}
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

  for (const expert of expertIds) {
    const baseDoc = {
      issue,
      expert,
      completed,
      consensusPhase,
      weightingMode: normalizedWeightingMode,
    };

    if (
      normalizedWeightingMode === "manual" ||
      normalizedWeightingMode === "consensus"
    ) {
      docs.push({
        ...baseDoc,
        manualWeights: buildNullObjectFromIds(criterionIds),
      });
      continue;
    }

    if (
      normalizedWeightingMode === "bwm" ||
      normalizedWeightingMode === "consensusbwm" ||
      normalizedWeightingMode === "simulatedconsensusbwm"
    ) {
      docs.push({
        ...baseDoc,
        bestCriterion: null,
        worstCriterion: null,
        bestToOthers: buildNullObjectFromIds(criterionIds),
        othersToWorst: buildNullObjectFromIds(criterionIds),
      });
    }
  }

  return docs;
};