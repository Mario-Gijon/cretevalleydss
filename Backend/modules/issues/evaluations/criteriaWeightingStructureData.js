import { getOrderedLeafCriteriaDb, getOrderedParentCriteriaDb } from "../shared/ordering.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

export const getOrderedCriteriaForWeightingOrThrow = async ({ issue }) => {
  const level = issue?.criteriaWeightingLevel === "parent" ? "parent" : "leaf";
  if (level === "parent") {
    const [parentCriteria, leafCriteria] = await Promise.all([
      getOrderedParentCriteriaDb({ issueId: issue?._id, issueDoc: issue, select: "_id name type parentCriterion position isLeaf", lean: true }),
      getOrderedLeafCriteriaDb({ issueId: issue?._id, issueDoc: issue, select: "_id name type parentCriterion position isLeaf", lean: true }),
    ]);
    return {
      leafCriteria,
      weightingCriteria: parentCriteria,
      criteria: parentCriteria.map((criterion) => ({ id: toIdString(criterion?._id), name: String(criterion?.name || "") })),
    };
  }
  const leafCriteria = await getOrderedLeafCriteriaDb({
    issueId: issue?._id,
    issueDoc: issue,
    select: "_id name",
    lean: true,
  });

  if (!Array.isArray(leafCriteria) || leafCriteria.length === 0) {
    throw createBadRequestError("Issue has no leaf criteria", {
      field: "criteria",
    });
  }

  const criteria = leafCriteria.map((criterion) => ({
    id: toIdString(criterion?._id),
    name: String(criterion?.name || ""),
  }));

  return {
    leafCriteria,
    weightingCriteria: leafCriteria,
    criteria,
  };
};

export const getOrderedParentCriteriaFromInputOrThrow = (criteriaNodes) => {
  if (!Array.isArray(criteriaNodes) || criteriaNodes.length === 0) {
    throw createBadRequestError("Issue has no criteria", { field: "criteria" });
  }
  const parents = [];
  const walk = (nodes, parent = null) => {
    for (const node of nodes) {
      const children = Array.isArray(node?.children) ? node.children : [];
      if (children.length === 0) {
        if (!parent) throw createBadRequestError("Parent criteria weighting requires every leaf to have a direct parent", { field: "criteriaWeightingConfig.level" });
        continue;
      }
      walk(children, node);
    }
  };
  const findParents = (nodes, parent = null) => {
    for (const node of nodes) {
      const children = Array.isArray(node?.children) ? node.children : [];
      if (children.length === 0) continue;
      if (children.some((child) => !Array.isArray(child?.children) || child.children.length > 0)) {
        findParents(children, node);
      } else {
        parents.push({ node, parent });
      }
    }
  };
  walk(criteriaNodes);
  findParents(criteriaNodes);
  const selectedNodes = new Set(parents.map((entry) => entry.node));
  const leaves = [];
  const collectLeaves = (nodes, parent = null) => {
    for (const node of nodes) {
      const children = Array.isArray(node?.children) ? node.children : [];
      if (children.length === 0) leaves.push({ node, parent });
      else collectLeaves(children, node);
    }
  };
  collectLeaves(criteriaNodes);
  if (parents.length === 0 || leaves.some((entry) => !selectedNodes.has(entry.parent)) || new Set(parents.map((entry) => entry.parent)).size !== 1 || parents.some((entry) => entry.node.children.some((child) => (child.children || []).length > 0))) {
    throw createBadRequestError("Parent criteria weighting hierarchy is ambiguous", { field: "criteriaWeightingConfig.level" });
  }
  return parents.map((entry) => entry.node);
};
