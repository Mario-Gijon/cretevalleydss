/**
 * Elimina tildes de una cadena.
 *
 * @param {string} str Cadena de entrada.
 * @returns {string}
 */
export const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};
