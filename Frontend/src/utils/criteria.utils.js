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
 * Obtiene todos los criterios hoja de un árbol.
 *
 * @param {object[]} criteria Árbol de criterios.
 * @returns {object[]}
 */
export const getLeafCriteria = (criteria) => {
  const leaves = [];

  const traverse = (nodes) => {
    nodes.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        leaves.push(node);
      } else {
        traverse(node.children);
      }
    });
  };

  traverse(criteria || []);
  return leaves;
};

/**
 * Comprueba si el nombre de un criterio ya existe en el árbol.
 *
 * @param {string} name Nombre del criterio.
 * @param {object[]} criteria Árbol de criterios.
 * @param {object|null} excludeCriterion Criterio a excluir en la comprobación.
 * @returns {boolean}
 */
const isCriteriaNameDuplicate = (name, criteria, excludeCriterion = null) => {
  const checkDuplicates = (items) => {
    return items.some((item) => {
      if (item.name === name && item !== excludeCriterion) return true;
      if (item.children?.length) return checkDuplicates(item.children);
      return false;
    });
  };

  return checkDuplicates(criteria);
};

/**
 * Valida el nombre de un criterio.
 *
 * @param {string} name Nombre del criterio.
 * @param {object[]} criteria Árbol de criterios.
 * @param {object|null} excludeCriterion Criterio a excluir en la comprobación.
 * @returns {string|null}
 */
export const validateCriterion = (
  name,
  criteria,
  excludeCriterion = null
) => {
  const trimmedValue = name.trim();

  if (!trimmedValue) return "Cannot be empty";
  if (trimmedValue.length > 35) return "Max 35 characters";
  if (isCriteriaNameDuplicate(trimmedValue, criteria, excludeCriterion)) {
    return "Criterion already exists";
  }

  return null;
};

/**
 * Actualiza recursivamente un criterio dentro del árbol.
 *
 * @param {object[]} items Árbol de criterios.
 * @param {object} editingCriterion Criterio a actualizar.
 * @param {string} newName Nuevo nombre.
 * @param {*} newType Nuevo tipo.
 * @returns {object[]}
 */
export const updateCriterion = (items, editingCriterion, newName, newType) => {
  return items.map((item) => {
    if (item.name === editingCriterion.name) {
      return { ...item, name: newName, type: newType };
    }

    if (item.children?.length) {
      return {
        ...item,
        children: updateCriterion(
          item.children,
          editingCriterion,
          newName,
          newType
        ),
      };
    }

    return item;
  });
};

/**
 * Elimina un criterio del árbol de forma recursiva.
 *
 * @param {object[]} items Árbol de criterios.
 * @param {object} itemToRemove Criterio a eliminar.
 * @returns {object[]}
 */
export const removeCriteriaItemRecursively = (items, itemToRemove) => {
  return items
    .map((i) => {
      if (i.name === itemToRemove.name) return null;

      if (i.children?.length) {
        return {
          ...i,
          children: removeCriteriaItemRecursively(i.children, itemToRemove),
        };
      }

      return i;
    })
    .filter(Boolean);
};
