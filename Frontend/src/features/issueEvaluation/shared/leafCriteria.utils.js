/**
 * Extrae los criterios hoja manteniendo su jerarquía de nombres.
 *
 * @param {Array} criteria
 * @param {string[]} parentPath
 * @returns {Array}
 */
export const extractLeafCriteria = (criteria, parentPath = []) => {
  let leafCriteria = [];

  (criteria || []).forEach((criterion) => {
    const currentPath = [...parentPath, criterion.name];

    if (criterion.isLeaf) {
      leafCriteria.push({ ...criterion, path: currentPath });
      return;
    }

    leafCriteria = [
      ...leafCriteria,
      ...extractLeafCriteria(criterion.children || [], currentPath),
    ];
  });

  return leafCriteria;
};