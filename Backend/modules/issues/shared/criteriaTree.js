import { orderDocsByIdList } from "./ordering.js";
import { toIdString } from "../../utils/common/ids.js";

export const buildIssueCriteriaTree = (criteria, issue) => {
  const normalizedCriteria = criteria.map((criterion) => ({
    id: toIdString(criterion._id),
    name: criterion.name,
    type: criterion.type,
    isLeaf: criterion.isLeaf,
    expressionDomain: criterion.expressionDomain || null,
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

  const leafCriteria = normalizedCriteria.filter((node) => node.isLeaf);

  const orderedLeafCriteria = orderDocsByIdList(leafCriteria, issue.leafCriteriaOrder, {
    getId: (node) => node.id,
    getName: (node) => node.name,
  });

  return {
    criteriaTree,
    orderedLeafCriteria,
  };
};

export const decorateCriteriaTree = (criteriaTree, finalWeightsById) => {
  const decorateNode = (node, depth = 0) => {
    const isLeaf = node.isLeaf || node.children.length === 0;

    node.depth = depth;
    node.display = {
      showType: depth === 0,
      showWeight: isLeaf,
      weight: isLeaf ? finalWeightsById[node.id] : undefined,
    };

    if (node.children.length > 0) {
      node.children.forEach((child) => decorateNode(child, depth + 1));
    }
  };

  criteriaTree.forEach((root) => decorateNode(root, 0));
};
