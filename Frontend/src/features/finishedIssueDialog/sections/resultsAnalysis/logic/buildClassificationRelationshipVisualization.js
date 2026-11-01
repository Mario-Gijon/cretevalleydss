const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const MAX_AUXILIARY_PROJECTION_STRESS = 0.15;

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

/** Build an optional scatter view from a validated categorical-pattern projection. */
export const buildClassificationPatternProjectionVisualization = (execution) => {
  const projection = execution?.genericAnalysis?.facts?.expertCollectiveClassificationRelationship?.auxiliaryProjection;
  const points = projection?.points;
  const stress = projection?.stress;
  const maximumStress = projection?.maximumStress;
  if (projection?.type !== "auxiliary_categorical_agreement_projection"
    || projection?.dissimilarity !== "normalized_hamming_category_mismatch"
    || !isFiniteNumber(stress) || !isFiniteNumber(maximumStress)
    || maximumStress > MAX_AUXILIARY_PROJECTION_STRESS || stress < 0 || stress > maximumStress
    || !Array.isArray(points) || points.length < 4) return null;

  const experts = [];
  const collective = [];
  const seenNames = new Set();
  let totalAlternatives = null;
  for (const point of points) {
    const name = typeof point?.name === "string" ? point.name.trim() : "";
    const matches = point?.exactCategoryMatches;
    const total = point?.totalAlternatives;
    if (!name || seenNames.has(name) || !["expert", "collective"].includes(point?.kind)
      || !isFiniteNumber(point?.x) || !isFiniteNumber(point?.y)
      || !Number.isInteger(matches) || !Number.isInteger(total) || total < 3 || matches < 0 || matches > total
      || (totalAlternatives !== null && totalAlternatives !== total)) return null;
    seenNames.add(name);
    totalAlternatives = total;
    const normalizedPoint = {
      label: name,
      x: point.x,
      y: point.y,
      details: {
        exactCategoryMatches: matches,
        totalAlternatives: total,
        categoryMismatchCount: total - matches,
      },
    };
    (point.kind === "collective" ? collective : experts).push(normalizedPoint);
  }
  if (experts.length < 3 || collective.length !== 1) return null;

  return {
    key: "expert-collective-categorical-pattern-projection",
    type: "scatter",
    title: "Auxiliary categorical agreement-pattern projection",
    description: "This auxiliary 2D view uses saved category assignments only. Position reflects normalized category mismatches, not AHPSort distance or AHP priorities; it is shown only when the 2D fit is sufficiently solid.",
    xAxis: { label: "Projection dimension 1", hideTickLabels: true },
    yAxis: { label: "Projection dimension 2", hideTickLabels: true },
    presentation: {
      tooltip: { variant: "categorical-pattern-projection" },
      chartHeight: { xs: 300, sm: 320 },
    },
    data: {
      series: [
        { key: "experts", label: "Experts", points: experts },
        { key: "collective", label: "Collective result", pointStyle: "rectRot", pointRadius: 7, points: collective },
      ],
    },
  };
};

export default buildClassificationRelationshipVisualization;
