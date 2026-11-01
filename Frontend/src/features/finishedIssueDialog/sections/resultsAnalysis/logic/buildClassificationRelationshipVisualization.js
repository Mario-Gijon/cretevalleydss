const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

/** Build a categorical comparison chart only from saved, validated classifications. */
export const buildClassificationRelationshipVisualization = (execution) => {
  const relationship = execution?.genericAnalysis?.facts?.expertCollectiveClassificationRelationship;
  const experts = relationship?.experts;
  if (relationship?.metric !== "exact_category_match_rate" || !Array.isArray(experts) || experts.length < 2) return null;

  const normalized = [];
  const seenIds = new Set();
  const seenNames = new Set();
  for (const expert of experts) {
    const name = typeof expert?.name === "string" ? expert.name.trim() : "";
    const id = typeof expert?.expertId === "string" ? expert.expertId.trim() : "";
    const matches = expert?.exactCategoryMatches;
    const total = expert?.totalAlternatives;
    const rate = expert?.matchRate;
    if (!id || !name || seenIds.has(id) || seenNames.has(name) ||
      !Number.isInteger(matches) || !Number.isInteger(total) || total <= 0 || matches < 0 || matches > total ||
      !isFiniteNumber(rate) || Math.abs(rate - matches / total) > 1e-12) return null;
    seenIds.add(id);
    seenNames.add(name);
    normalized.push({
      name,
      rate: rate * 100,
      details: {
        exactCategoryMatches: matches,
        totalAlternatives: total,
        disagreements: Array.isArray(expert.disagreements) ? expert.disagreements : [],
      },
    });
  }

  return {
    key: "expert-collective-classification-match",
    type: "bar",
    title: "Exact category match by expert",
    description: "Percentage of alternatives where the expert's saved category matches the collective category. This is categorical agreement, not a numeric distance between evaluations.",
    orientation: "horizontal",
    xAxis: {
      label: "Alternatives matching collective category (%)",
      tickSuffix: "%",
    },
    yAxis: { label: "Expert" },
    valueAxis: { min: 0, max: 100 },
    presentation: { tooltip: { variant: "exact-category-match" } },
    data: {
      categories: normalized.map((expert) => expert.name),
      series: [{
        key: "exact-category-match",
        label: "Exact category matches (%)",
        values: normalized.map((expert) => expert.rate),
      }],
      details: normalized.map((expert) => expert.details),
    },
  };
};

export default buildClassificationRelationshipVisualization;
