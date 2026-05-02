/**
 * Construye la matriz de evaluaciones directas alternativa x criterio.
 *
 * @param {Object} params
 * @param {Array} params.alternatives Lista de alternativas.
 * @param {Array} params.leafCriteria Lista de criterios hoja (nombres).
 * @param {Object} params.fetchedEvaluations Evaluaciones recuperadas del backend.
 * @returns {Object}
 */
export const buildDirectEvaluationsMatrix = ({
  alternatives = [],
  leafCriteria = [],
  fetchedEvaluations = {},
}) => {
  const merged = {};

  alternatives.forEach((alternative) => {
    merged[alternative] = {};

    leafCriteria.forEach((criterionName) => {
      merged[alternative][criterionName] =
        fetchedEvaluations?.[alternative]?.[criterionName] ?? {
          value: "",
          domain: null,
        };
    });
  });

  return merged;
};

const getDirectCellDomain = (cell) =>
  cell && typeof cell === "object" && cell.domain ? cell.domain : null;

/**
 * Limpia las evaluaciones directas manteniendo el dominio de cada celda.
 *
 * @param {Object} params
 * @param {Array} params.alternatives Lista de alternativas.
 * @param {Array} params.criteria Lista de criterios hoja (nombres).
 * @param {Object} params.evaluations Estado actual de evaluaciones.
 * @returns {Object}
 */
export const buildClearedDirectEvaluations = ({
  alternatives = [],
  criteria = [],
  evaluations = {},
}) => {
  const cleared = {};

  alternatives.forEach((alternative) => {
    cleared[alternative] = {};

    criteria.forEach((criterionName) => {
      const previousCell = evaluations?.[alternative]?.[criterionName];
      const domain = getDirectCellDomain(previousCell);

      cleared[alternative][criterionName] = {
        value: "",
        domain,
      };
    });
  });

  return cleared;
};

/**
 * Construye el payload de guardado para evaluación directa.
 *
 * @param {Object} params
 * @param {Object} params.evaluations Evaluaciones actuales del diálogo.
 * @returns {Object}
 */
export const buildDirectSavePayload = ({ evaluations }) => evaluations;

/**
 * Construye el payload de envío para evaluación directa.
 *
 * @param {Object} params
 * @param {Object} params.evaluations Evaluaciones actuales del diálogo.
 * @returns {Object}
 */
export const buildDirectSubmitPayload = ({ evaluations }) => evaluations;

