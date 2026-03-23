/**
 * Construye el árbol de criterios de un issue a partir de una lista plana.
 *
 * @param {Array<Object>} criteriaList Lista plana de criterios.
 * @param {string|Object} issueId Id del issue.
 * @param {{ sort?: boolean }} [options] Opciones de construcción.
 * @returns {Array<Object>}
 */
export const buildCriterionTree = (criteriaList, issueId, { sort = true } = {}) => {
  const issueIdStr = String(issueId);
  const criteriaMap = new Map();

  for (const criterion of criteriaList || []) {
    if (String(criterion.issue) !== issueIdStr) continue;

    const criterionId = String(criterion._id);

    criteriaMap.set(criterionId, {
      _id: criterionId,
      name: criterion.name,
      type: criterion.type,
      isLeaf: Boolean(criterion.isLeaf),
      children: [],
      parentCriterion: criterion.parentCriterion ? String(criterion.parentCriterion) : null,
    });
  }

  const roots = [];

  for (const criterion of criteriaList || []) {
    if (String(criterion.issue) !== issueIdStr) continue;

    const node = criteriaMap.get(String(criterion._id));
    if (!node) continue;

    if (criterion.parentCriterion) {
      const parent = criteriaMap.get(String(criterion.parentCriterion));

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  if (sort) {
    const sortRecursively = (nodes) => {
      nodes.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      for (const node of nodes) {
        if (node.children?.length) {
          sortRecursively(node.children);
        }
      }
    };

    sortRecursively(roots);
  }

  return roots;
};

/**
 * Devuelve los nombres de los criterios hoja recorriendo el árbol en profundidad.
 *
 * @param {Array<Object>} criteriaTree Árbol de criterios.
 * @returns {Array<string>}
 */
export const getLeafNamesFromTree = (criteriaTree) => {
  const leafNames = [];

  const visitNode = (node) => {
    if (!node?.children?.length) {
      leafNames.push(node.name);
      return;
    }

    node.children.forEach(visitNode);
  };

  (criteriaTree || []).forEach(visitNode);

  return leafNames;
};

/**
 * Devuelve los nombres de criterios hoja ordenados alfabéticamente.
 *
 * @param {Array<Object>} criteriaList Lista plana de criterios.
 * @param {string|Object} issueId Id del issue.
 * @returns {Array<string>}
 */
export const getLeafNamesSorted = (criteriaList, issueId) => {
  const issueIdStr = String(issueId);

  return (criteriaList || [])
    .filter((criterion) => String(criterion.issue) === issueIdStr && criterion.isLeaf)
    .map((criterion) => criterion.name)
    .sort((a, b) => (a || "").localeCompare(b || ""));
};