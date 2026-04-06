/**
 * Convierte un identificador a string normalizado sin entrar en recursión.
 *
 * Soporta strings, números, ObjectId, documentos con _id o id
 * y objetos con métodos toHexString()/toString().
 *
 * @param {any} value Valor a convertir.
 * @returns {string}
 */
export const toIdString = (value) => {
  if (value == null) return "";

  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);

  if (typeof value !== "object") {
    return "";
  }

  if (typeof value.toHexString === "function") {
    const result = value.toHexString();
    return typeof result === "string" ? result.trim() : "";
  }

  if (value._id != null && value._id !== value) {
    return toIdString(value._id);
  }

  if (value.id != null && value.id !== value) {
    return toIdString(value.id);
  }

  if (typeof value.toString === "function") {
    const result = value.toString();
    return typeof result === "string" ? result.trim() : "";
  }

  return "";
};
/**
 * Comprueba si dos identificadores representan el mismo valor.
 *
 * @param {any} a Primer identificador.
 * @param {any} b Segundo identificador.
 * @returns {boolean}
 */
export const sameId = (a, b) => {
  const left = toIdString(a);
  const right = toIdString(b);

  return Boolean(left && right && left === right);
};

/**
 * Devuelve una lista de ids únicos normalizados como string.
 *
 * @param {Array<any>} [values=[]] Valores de entrada.
 * @returns {Array<string>}
 */
export const uniqueIdStrings = (values = []) => {
  return [...new Set(values.map(toIdString).filter(Boolean))];
};

/**
 * Indexa una colección por id en un Map.
 *
 * @param {Array<any>} [items=[]] Elementos a indexar.
 * @returns {Object} Selector del id. Si no se indica, usa el propio item.
 * @returns {Map<string, any>}
 */
export const indexById = (items = [], selector = null) => {
  const map = new Map();

  for (const item of items) {
    const rawId =
      typeof selector === "function"
        ? selector(item)
        : selector
        ? item?.[selector]
        : item;

    const id = toIdString(rawId);
    if (id) map.set(id, item);
  }

  return map;
};

/**
 * Ordena una colección según un orden externo de ids.
 *
 * Los elementos cuyo id no esté presente en idOrder quedan al final.
 *
 * @param {Array<any>} [items=[]] Elementos a ordenar.
 * @param {Array<any>} [idOrder=[]] Orden de ids de referencia.
 * @param {string|Function|null} [selector=null] Selector del id. Si no se indica, usa el propio item.
 * @returns {Array<any>}
 */
export const sortByIdOrder = (items = [], idOrder = [], selector = null) => {
  const orderMap = new Map(
    uniqueIdStrings(idOrder).map((id, index) => [id, index])
  );

  return [...items].sort((a, b) => {
    const aId = toIdString(
      typeof selector === "function" ? selector(a) : selector ? a?.[selector] : a
    );
    const bId = toIdString(
      typeof selector === "function" ? selector(b) : selector ? b?.[selector] : b
    );

    const aIndex = orderMap.has(aId) ? orderMap.get(aId) : Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.has(bId) ? orderMap.get(bId) : Number.MAX_SAFE_INTEGER;

    return aIndex - bIndex;
  });
};