/**
 * Extrae evaluaciones de borrador pairwise desde la respuesta del backend.
 *
 * @param {Object|null} response Respuesta del servicio.
 * @returns {Object|null}
 */
export const extractPairwiseDraftEvaluations = (response) =>
  response?.data?.evaluations ?? null;

/**
 * Extrae evaluaciones colectivas pairwise desde la respuesta del backend.
 *
 * Prioriza `collectiveEvaluationsLocalized` y usa
 * `collectiveEvaluations` como fallback.
 *
 * @param {Object|null} response Respuesta del servicio.
 * @returns {Object|null}
 */
export const extractPairwiseCollectiveEvaluations = (response) =>
  response?.data?.collectiveEvaluationsLocalized ??
  response?.data?.collectiveEvaluations ??
  null;

