/**
 * Devuelve los criterios hoja de un árbol de criterios.
 *
 * @param {Array} criteria
 * @returns {Array}
 */
export const getLeafCriteria = (criteria) => {
  const leaves = [];

  const traverse = (nodes) => {
    (nodes || []).forEach((node) => {
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