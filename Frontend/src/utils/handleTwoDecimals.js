/**
 * Normaliza un valor numérico en texto permitiendo solo dígitos, un punto
 * decimal y como máximo dos decimales.
 *
 * @param {string|number|null|undefined} value Valor de entrada.
 * @returns {string}
 */
export const handleNumberInput = (value) => {
  if (value === "" || value === null || value === undefined) return "";

  let strValue = value.toString();

  strValue = strValue.replace(/[^0-9.]/g, "");
  const parts = strValue.split(".");

  if (parts.length > 2) {
    strValue = parts[0] + "." + parts.slice(1).join("");
  }

  if (parts[1]?.length > 2) {
    strValue = parts[0] + "." + parts[1].slice(0, 2);
  }

  return strValue;
};