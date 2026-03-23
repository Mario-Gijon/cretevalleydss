export const EVALUATION_STRUCTURES = {
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
};

export const resolveEvaluationStructure = (doc) => {
  if (doc?.evaluationStructure) return doc.evaluationStructure;

  if (doc?.isPairwise === true) {
    return EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;
  }

  return EVALUATION_STRUCTURES.DIRECT;
};

export const isDirectStructure = (doc) =>
  resolveEvaluationStructure(doc) === EVALUATION_STRUCTURES.DIRECT;

export const isPairwiseAlternativesStructure = (doc) =>
  resolveEvaluationStructure(doc) ===
  EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;