/**
 * Normaliza un string aplicando trim, colapso de espacios y lowercase opcional.
 *
 * @param {any} value Valor a normalizar.
 * @param {{
 *   trim?: boolean,
 *   collapseWhitespace?: boolean,
 *   lower?: boolean
 * }} [options={}] Opciones de normalización.
 * @returns {string}
 */
export const normalizeString = (
  value,
  {
    trim = true,
    collapseWhitespace = true,
    lower = false,
  } = {}
) => {
  let result = value == null ? "" : String(value);

  if (trim) result = result.trim();
  if (collapseWhitespace) result = result.replace(/\s+/g, " ");
  if (lower) result = result.toLowerCase();

  return result;
};

/**
 * Normaliza un string opcional y devuelve null si queda vacío.
 *
 * @param {any} value Valor a normalizar.
 * @param {{
 *   trim?: boolean,
 *   collapseWhitespace?: boolean,
 *   lower?: boolean
 * }} [options={}] Opciones de normalización.
 * @returns {string | null}
 */
export const normalizeOptionalString = (value, options = {}) => {
  const normalized = normalizeString(value, options);
  return normalized || null;
};

/**
 * Normaliza un email a un formato comparable.
 *
 * @param {any} value Email a normalizar.
 * @returns {string}
 */
export const normalizeEmail = (value) =>
  normalizeString(value, {
    trim: true,
    collapseWhitespace: true,
    lower: true,
  });

/**
 * Elimina acentos y diacríticos de un texto.
 *
 * @param {any} value Texto de entrada.
 * @returns {string}
 */
export const removeAccents = (value) =>
  normalizeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Comprueba si query está contenido en text tras normalizar ambos.
 *
 * @param {any} text Texto completo.
 * @param {any} query Texto buscado.
 * @returns {boolean}
 */
export const includesNormalized = (text, query) => {
  const normalizedText = removeAccents(text).toLowerCase();
  const normalizedQuery = removeAccents(query).toLowerCase();

  return normalizedText.includes(normalizedQuery);
};

/**
 * Comprueba si un valor representa un string no vacío tras normalizarlo.
 *
 * @param {any} value Valor a comprobar.
 * @returns {boolean}
 */
export const isNonEmptyString = (value) => normalizeString(value).length > 0;

/**
 * Devuelve una lista de strings únicos, normalizados y no vacíos.
 *
 * @param {unknown[]} [values=[]] Valores de entrada.
 * @returns {string[]}
 */
export const getUniqueTrimmedStrings = (values = []) => {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeString(value))
        .filter(Boolean)
    ),
  ];
};