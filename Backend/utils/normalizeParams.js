import { normalizeValue } from "./normalizeValue.js";

/**
 * Normaliza los parámetros de un modelo.
 *
 * @param {Object} params Parámetros a normalizar.
 * @returns {Object}
 */
export const normalizeParams = (params) => {
  const normalizedParams = {};

  for (const key in params) {
    if (Array.isArray(params[key])) {
      normalizedParams[key] = params[key].map((value) => normalizeValue(value));
    } else {
      normalizedParams[key] = normalizeValue(params[key]);
    }
  }

  return normalizedParams;
};