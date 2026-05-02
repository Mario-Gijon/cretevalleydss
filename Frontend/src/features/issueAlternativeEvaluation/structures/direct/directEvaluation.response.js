/**
 * Extrae evaluaciones de borrador directo desde la respuesta del backend.
 *
 * @param {Object|null} response Respuesta del servicio.
 * @returns {Object|null}
 */
export const extractDirectDraftEvaluations = (response) =>
  response?.data?.evaluations ?? null;

/**
 * Extrae evaluaciones colectivas directas desde la respuesta del backend.
 *
 * Prioriza `collectiveEvaluationsLocalized` y usa
 * `collectiveEvaluations` como fallback.
 *
 * @param {Object|null} response Respuesta del servicio.
 * @returns {Object|null}
 */
export const extractDirectCollectiveEvaluations = (response) =>
  response?.data?.collectiveEvaluationsLocalized ??
  response?.data?.collectiveEvaluations ??
  null;

