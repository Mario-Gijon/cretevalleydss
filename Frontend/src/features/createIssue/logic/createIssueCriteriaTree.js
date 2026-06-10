export const collectLeafCriteriaByRoot = (criteria) => {
  const byRoot = {};

  const collectLeaves = (nodes = [], rootName) => {
    for (const node of nodes) {
      const children = Array.isArray(node?.children) ? node.children : [];
      if (children.length === 0) {
        if (!byRoot[rootName]) byRoot[rootName] = [];
        byRoot[rootName].push(node);
        continue;
      }

      collectLeaves(children, rootName);
    }
  };

  for (const rootCriterion of Array.isArray(criteria) ? criteria : []) {
    const rootName = rootCriterion?.name;
    if (!rootName) continue;
    collectLeaves([rootCriterion], rootName);
  }

  return byRoot;
};
