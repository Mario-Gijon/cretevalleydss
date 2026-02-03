// src/utils/criteriaTree.js

/**
 * Construye el árbol de criterios de un issue a partir de una lista plana.
 * - Filtra por issueId
 * - Enlaza parent -> children
 * - Ordena alfabéticamente (opcional)
 *
 * @param {Array} criteriaList - lista plana de criterios (docs mongoose o lean)
 * @param {String|Object} issueId
 * @param {Object} options
 * @param {boolean} options.sort - ordenar alfabéticamente (default true)
 * @returns {Array} raíz del árbol
 */
export const buildCriterionTree = (criteriaList, issueId, { sort = true } = {}) => {
  const issueIdStr = String(issueId);
  const criteriaMap = new Map();

  // 1) Crear nodos (solo del issue)
  for (const crit of criteriaList) {
    if (String(crit.issue) !== issueIdStr) continue;

    const idStr = String(crit._id);
    criteriaMap.set(idStr, {
      _id: idStr,
      name: crit.name,
      type: crit.type,
      isLeaf: Boolean(crit.isLeaf),
      children: [],
      parentCriterion: crit.parentCriterion ? String(crit.parentCriterion) : null,
    });
  }

  // 2) Enlazar padre/hijo + obtener raíces
  const roots = [];
  for (const crit of criteriaList) {
    if (String(crit.issue) !== issueIdStr) continue;

    const node = criteriaMap.get(String(crit._id));
    if (!node) continue;

    if (crit.parentCriterion) {
      const parent = criteriaMap.get(String(crit.parentCriterion));
      if (parent) parent.children.push(node);
      else roots.push(node); // fallback: si el parent no viene en la lista
    } else {
      roots.push(node);
    }
  }

  // 3) Ordenar recursivo si procede
  if (sort) {
    const sortRec = (arr) => {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      for (const n of arr) {
        if (n.children?.length) sortRec(n.children);
      }
    };
    sortRec(roots);
  }

  return roots;
};

/**
 * Devuelve los nombres de los criterios hoja en el orden en que aparecen
 * al recorrer el árbol (DFS).
 *
 * @param {Array} criteriaTree
 * @returns {Array<string>}
 */
export const getLeafNamesFromTree = (criteriaTree) => {
  const leaves = [];
  const dfs = (node) => {
    if (!node?.children?.length) {
      leaves.push(node.name);
      return;
    }
    node.children.forEach(dfs);
  };
  (criteriaTree || []).forEach(dfs);
  return leaves;
};

/**
 * Si NO necesitas árbol y solo quieres hojas ordenadas alfabéticamente,
 * esto suele ser más robusto para mapear weights por nombre.
 *
 * @param {Array} criteriaList
 * @param {String|Object} issueId
 * @returns {Array<string>}
 */
export const getLeafNamesSorted = (criteriaList, issueId) => {
  const issueIdStr = String(issueId);
  return (criteriaList || [])
    .filter((c) => String(c.issue) === issueIdStr && c.isLeaf)
    .map((c) => c.name)
    .sort((a, b) => (a || "").localeCompare(b || ""));
};
