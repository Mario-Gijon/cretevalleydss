/**
 * Validador reutilizable para arrays numéricos ordenados.
 *
 * Se usa en dominios lingüísticos para garantizar que:
 * - el valor sea un array,
 * - tenga al menos dos elementos,
 * - todos los elementos sean números finitos,
 * - y estén en orden no decreciente.
 */
export const orderedNumericArrayValidator = {
  validator(values) {
    return (
      Array.isArray(values) &&
      values.length >= 2 &&
      values.every((value) => typeof value === "number" && Number.isFinite(value)) &&
      values.every((value, index) => index === 0 || values[index - 1] <= value)
    );
  },
  message: "values must be an ordered numeric array with at least 2 elements",
};