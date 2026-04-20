/**
 * Cuenta criterios hoja dentro de un árbol de criterios.
 *
 * @param {Array} items Árbol de criterios.
 * @returns {number}
 */
export const countLeafCriteria = (items = []) => {
  return items.reduce((accumulator, item) => {
    if (!item?.children || item.children.length === 0) {
      return accumulator + 1;
    }

    return accumulator + countLeafCriteria(item.children);
  }, 0);
};

/**
 * Lee el estado persistido del flujo createIssue desde localStorage.
 *
 * @param {string} storageKey Clave de almacenamiento.
 * @returns {Object}
 */
export const readStoredCreateIssueData = (storageKey) => {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
};
