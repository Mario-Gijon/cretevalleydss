// src/utils/evaluationStructure.js
export const ISSUE_EVALUATION_STRUCTURES = {
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
};

export const resolveIssueEvaluationStructure = (source) => {
  if (source?.evaluationStructure) {
    return source.evaluationStructure;
  }

  if (source?.summary?.evaluationStructure) {
    return source.summary.evaluationStructure;
  }

  if (source?.modelParams?.base?.evaluationStructure) {
    return source.modelParams.base.evaluationStructure;
  }

  if (source?.isPairwise === true || source?.summary?.isPairwise === true) {
    return ISSUE_EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;
  }

  return ISSUE_EVALUATION_STRUCTURES.DIRECT;
};

export const isPairwiseEvaluationStructure = (source) =>
  resolveIssueEvaluationStructure(source) ===
  ISSUE_EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;

const countLeafCriteria = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0;

  let count = 0;
  const stack = [...nodes];

  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;

    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) {
      count += 1;
    } else {
      stack.push(...children);
    }
  }

  return count;
};

export const getLeafCriteriaCountFromIssue = (source) => {
  if (Array.isArray(source?.modelParams?.leafCriteria)) {
    return source.modelParams.leafCriteria.length;
  }

  if (Array.isArray(source?.modelParams?.base?.leafCriteria)) {
    return source.modelParams.base.leafCriteria.length;
  }

  if (Array.isArray(source?.summary?.criteria)) {
    return countLeafCriteria(source.summary.criteria);
  }

  if (Array.isArray(source?.criteria)) {
    return countLeafCriteria(source.criteria);
  }

  return 0;
};

export const hasSingleLeafCriterion = (source) =>
  getLeafCriteriaCountFromIssue(source) === 1;