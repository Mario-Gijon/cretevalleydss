import { buildIssueCriteriaTree } from "../modules/issues/issue.active.js";

/**
 * Construye el árbol de criterios de un issue a partir de una lista plana.
 *
 * Mantiene el contrato histórico del helper:
 * - devuelve solo las raíces
 * - usa _id y parentCriterion
 * - permite orden alfabético opcional
 *
 * @param {Array<Object>} criteriaList Lista plana de criterios.
 * @param {string|Object} issueId Id del issue.
 * @param {{ sort?: boolean, issueDoc?: Object|null }} [options] Opciones.
 * @returns {Array<Object>}
 */
export const buildCriterionTree = (
  criteriaList,
  issueId,
  { sort = true, issueDoc = null } = {}
) => {
  const issueCriteria = (criteriaList || []).filter(
    (criterion) => String(criterion.issue) === String(issueId)
  );

  const safeIssueDoc = issueDoc || {
    leafCriteriaOrder: [],
  };

  const { criteriaTree } = buildIssueCriteriaTree(issueCriteria, safeIssueDoc);

  const mapNode = (node) => ({
    _id: node.id,
    name: node.name,
    type: node.type,
    isLeaf: Boolean(node.isLeaf),
    parentCriterion: node.parentId || null,
    children: (node.children || []).map(mapNode),
  });

  const roots = (criteriaTree || []).map(mapNode);

  if (sort) {
    const sortRecursively = (nodes) => {
      nodes.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      for (const child of nodes) {
        if (child.children?.length) {
          sortRecursively(child.children);
        }
      }
    };

    sortRecursively(roots);
  }

  return roots;
};
