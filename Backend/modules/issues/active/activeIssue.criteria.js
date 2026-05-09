import { orderDocsByIdList } from "../issue.ordering.js";
import { toIdString } from "../../../utils/common/ids.js";

/**
 * Construye el árbol de criterios del issue y devuelve también
 * la lista de criterios hoja en el orden configurado en el issue.
 *
 * @param {Array<Object>} issueCriteriaDocs Criterios del issue.
 * @param {Object} issueDoc Documento del issue.
 * @returns {Object}
 */
export const buildIssueCriteriaTree = (issueCriteriaDocs, issueDoc) => {
  const normalizedCriteria = issueCriteriaDocs.map((criterion) => ({
    id: toIdString(criterion._id),
    name: criterion.name,
    type: criterion.type,
    isLeaf: Boolean(criterion.isLeaf),
    parentId: toIdString(criterion.parentCriterion),
    children: [],
  }));

  const byId = new Map(normalizedCriteria.map((node) => [node.id, node]));
  const criteriaTree = [];

  for (const node of normalizedCriteria) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node);
    } else {
      criteriaTree.push(node);
    }
  }

  const leafNodes = normalizedCriteria.filter((node) => node.isLeaf);

  const orderedLeafNodes = orderDocsByIdList(
    leafNodes,
    issueDoc.leafCriteriaOrder,
    {
      getId: (node) => node.id,
      getName: (node) => node.name,
    }
  );

  return {
    criteriaTree,
    orderedLeafNodes,
  };
};

/**
 * Añade metadata de visualización al árbol de criterios.
 *
 * @param {Array<Object>} criteriaTree Árbol de criterios.
 * @param {Object} finalWeightsById Pesos finales por id.
 * @returns {void}
 */
export const decorateCriteriaTree = (criteriaTree, finalWeightsById) => {
  const decorateNode = (node, depth = 0) => {
    const isLeaf = Boolean(node.isLeaf) || !(node.children?.length);

    node.depth = depth;
    node.display = {
      showType: depth === 0,
      showWeight: isLeaf,
      weight: isLeaf ? finalWeightsById?.[node.id] ?? null : null,
    };

    if (node.children?.length) {
      node.children.forEach((child) => decorateNode(child, depth + 1));
    }
  };

  criteriaTree.forEach((root) => decorateNode(root, 0));
};
