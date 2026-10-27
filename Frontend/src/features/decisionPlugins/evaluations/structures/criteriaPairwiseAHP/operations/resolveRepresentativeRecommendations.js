const getPairKey = (recommendation) => {
  const first = String(recommendation?.comparison?.criterionId ?? "").trim();
  const second = String(recommendation?.comparison?.comparedCriterionId ?? "").trim();
  if (!first || !second || first === second) return null;
  return JSON.stringify([first, second].sort());
};

export const groupRecommendationsByCriterionPair = (recommendations) => {
  const groups = new Map();

  for (const recommendation of Array.isArray(recommendations) ? recommendations : []) {
    const key = getPairKey(recommendation);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(recommendation);
  }

  return [...groups.entries()].map(([key, groupedRecommendations]) => ({
    key,
    recommendations: groupedRecommendations,
  }));
};

export const resolveRepresentativeRecommendations = (recommendations) =>
  groupRecommendationsByCriterionPair(recommendations)
    .map((group) => group.recommendations[0]);
