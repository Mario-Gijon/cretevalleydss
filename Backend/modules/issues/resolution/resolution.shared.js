/**
 * Construye el array de tipos de criterio compatible con los modelos directos.
 *
 * @param {Array<Object>} criteria Criterios hoja ordenados.
 * @returns {string[]}
 */
export const buildCriterionTypes = (criteria) =>
  criteria.map((criterion) => (criterion.type === "benefit" ? "max" : "min"));

/**
 * Cuenta valores null dentro de una estructura arbitraria de matrices.
 *
 * @param {unknown} value Estructura a inspeccionar.
 * @returns {number}
 */
export const countNullsDeep = (value) => {
  if (value == null) {
    return 1;
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, item) => acc + countNullsDeep(item), 0);
  }

  if (typeof value === "object") {
    return Object.values(value).reduce((acc, item) => acc + countNullsDeep(item), 0);
  }

  return 0;
};
