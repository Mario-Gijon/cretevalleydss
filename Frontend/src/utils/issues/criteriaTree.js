export const getLeafCriteria = (nodes = []) => {
  const leaves = [];
  const stack = Array.isArray(nodes) ? [...nodes] : [];

  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;

    const children = Array.isArray(node.children) ? node.children : [];

    if (children.length === 0) {
      leaves.push(node);
      continue;
    }

    stack.push(...children);
  }

  return leaves;
};

export const countLeafCriteria = (nodes = []) => getLeafCriteria(nodes).length;

export const hasSingleLeafCriterion = (nodes = []) => countLeafCriteria(nodes) === 1;