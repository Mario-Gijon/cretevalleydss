const readPairIds = (comparison) => {
  const first = String(
    comparison?.criterionId ?? comparison?.fromCriterionId ?? "",
  ).trim();
  const second = String(
    comparison?.comparedCriterionId ?? comparison?.toCriterionId ?? "",
  ).trim();
  return first && second && first !== second ? [first, second] : null;
};

const pairKey = (first, second) => JSON.stringify([first, second].sort());

export const resolveReviewCandidatePairs = (diagnostic) => {
  const pairs = new Set();
  const add = (comparison) => {
    const ids = readPairIds(comparison);
    if (ids) pairs.add(pairKey(...ids));
  };

  (Array.isArray(diagnostic?.candidateComparisons)
    ? diagnostic.candidateComparisons
    : []).forEach(add);
  (Array.isArray(diagnostic?.triads) ? diagnostic.triads : []).forEach((triad) => {
    (Array.isArray(triad?.candidateComparisons)
      ? triad.candidateComparisons
      : []).forEach(add);
  });
  (Array.isArray(diagnostic?.recommendations)
    ? diagnostic.recommendations
    : []).forEach((recommendation) => add(recommendation?.comparison));

  return pairs;
};

export const isReviewCandidatePair = (pairs, firstId, secondId) =>
  pairs instanceof Set &&
  pairs.has(pairKey(String(firstId ?? ""), String(secondId ?? "")));
