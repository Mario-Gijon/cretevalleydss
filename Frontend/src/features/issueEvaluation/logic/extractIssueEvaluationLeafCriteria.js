/**
 * Extrae los criterios hoja manteniendo su jerarquía de nombres.
 *
 * @param {Array} [criteria=[]]
 * @param {string[]} parentPath
 * @returns {Array}
 */
export const extractLeafCriteria = (criteria = [], parentPath = []) => {
  let leafCriteria = [];

  (Array.isArray(criteria) ? criteria : []).forEach((criterion) => {
    const criterionName = String(criterion?.name || "").trim();
    if (!criterionName) {
      return;
    }

    const currentPath = [...parentPath, criterionName];
    const children = Array.isArray(criterion?.children) ? criterion.children : [];

    if (criterion?.isLeaf === true || children.length === 0) {
      leafCriteria.push({ ...criterion, path: currentPath });
      return;
    }

    leafCriteria = [
      ...leafCriteria,
      ...extractLeafCriteria(children, currentPath),
    ];
  });

  return leafCriteria;
};
