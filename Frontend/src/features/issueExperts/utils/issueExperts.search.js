/**
 * Normaliza texto para búsquedas simples sin acentos
 * ni diferencias de mayúsculas.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string}
 */
export const normalizeIssueExpertsSearchValue = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
};