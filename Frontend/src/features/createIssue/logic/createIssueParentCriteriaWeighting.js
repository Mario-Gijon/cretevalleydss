const getChildren = (criterion) =>
  Array.isArray(criterion?.children) ? criterion.children : [];

const getCriterionKey = (criterion) => {
  const id = criterion?.id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
};

export const isParentCriteriaWeightingAvailable = (criteriaTree) => {
  const leaves = [];
  const parentsByKey = new Map();

  const visit = (nodes, parent = null, grandparent = null) => {
    for (const criterion of Array.isArray(nodes) ? nodes : []) {
      const children = getChildren(criterion);
      if (children.length === 0) {
        leaves.push({ criterion, parent, grandparent });
        continue;
      }
      visit(children, criterion, parent);
    }
  };

  visit(criteriaTree);
  if (leaves.length <= 1) return false;

  for (const leaf of leaves) {
    const parentKey = getCriterionKey(leaf.parent);
    if (!parentKey || getChildren(leaf.parent).length === 0) {
      return false;
    }
    parentsByKey.set(parentKey, {
      criterion: leaf.parent,
      grandparent: leaf.grandparent,
    });
  }

  const parents = Array.from(parentsByKey.values());
  const siblingLayerKey = getCriterionKey(parents[0]?.grandparent) || "__root__";
  if (
    parents.some(
      ({ grandparent }) =>
        (getCriterionKey(grandparent) || "__root__") !== siblingLayerKey
    )
  ) {
    return false;
  }

  return parents.every(({ criterion }) =>
    getChildren(criterion).every((child) => getChildren(child).length === 0)
  );
};
