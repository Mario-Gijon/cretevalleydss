import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

const normalizeCriterionLeafMetadata = (node) => {
  const idCandidate =
    normalizeNonEmptyString(node?._id?.toString?.()) ||
    normalizeNonEmptyString(node?._id) ||
    normalizeNonEmptyString(node?.id?.toString?.()) ||
    normalizeNonEmptyString(node?.id);
  const nameCandidate =
    normalizeNonEmptyString(node?.name?.toString?.()) ||
    normalizeNonEmptyString(node?.name);
  const keyCandidate =
    normalizeNonEmptyString(node?.key?.toString?.()) ||
    normalizeNonEmptyString(node?.key);

  if (!idCandidate && !keyCandidate && !nameCandidate) {
    return null;
  }

  return {
    id: idCandidate,
    key: keyCandidate,
    name: nameCandidate,
  };
};

export const countLeafCriteriaNodes = (nodes) => {
  if (!Array.isArray(nodes)) {
    return 0;
  }

  return nodes.reduce((count, node) => {
    const children = Array.isArray(node?.children) ? node.children : [];
    if (children.length === 0) {
      return count + 1;
    }

    return count + countLeafCriteriaNodes(children);
  }, 0);
};

export const extractLeafCriteriaMetadata = (nodes) => {
  if (!Array.isArray(nodes)) {
    return [];
  }

  const leafCriteria = [];

  const traverse = (items) => {
    for (const item of items) {
      const children = Array.isArray(item?.children) ? item.children : [];
      if (children.length === 0) {
        const normalized = normalizeCriterionLeafMetadata(item);
        if (normalized) {
          leafCriteria.push(normalized);
        }
        continue;
      }

      traverse(children);
    }
  };

  traverse(nodes);
  return leafCriteria;
};
