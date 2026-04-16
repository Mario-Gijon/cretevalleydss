/**
 * Normaliza un valor serializado o numérico.
 *
 * @param {*} value Valor a normalizar.
 * @returns {*}
 */
export const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "object") {
    if ("$numberDouble" in value) return Number(value.$numberDouble);
    if ("$numberInt" in value) return Number(value.$numberInt);
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if (typeof value === "number") {
    return value;
  }

  return value;
};

/**
 * Normaliza los parámetros de un modelo.
 *
 * @param {Object} [params={}] Parámetros a normalizar.
 * @returns {Object}
 */
export const normalizeParams = (params = {}) => {
  const normalizedParams = {};

  for (const [key, value] of Object.entries(params || {})) {
    normalizedParams[key] = Array.isArray(value)
      ? value.map((item) => normalizeValue(item))
      : normalizeValue(value);
  }

  return normalizedParams;
};