const guide = (title, text) => Object.freeze({ title, text });

export const MODEL_VISUALIZATION_READING_GUIDES = Object.freeze({
  "individual-preference-distribution": guide(
    "Individual preference distribution",
    "Each row is a criterion, and each colored circle is one expert's preference; the legend identifies the experts. The horizontal position gives its rank, with 1 meaning most important; small side-to-side offsets separate circles with the same rank without changing their value.",
  ),
  "collective-criterion-importance": guide(
    "Collective criterion importance",
    "Each bar shows a criterion's final collective weight as a percentage. A longer bar means the criterion carries more weight into the alternative evaluation; it does not show how many experts ranked it first.",
  ),
  "mcc-adjustment-map": guide(
    "Weight changes by expert and criterion",
    "Rows are experts; columns are criteria. Number and color show the calculated weight change for one expert and criterion: positive means raised, negative means lowered, and zero means unchanged. It does not show a change in the expert's stated preference.",
  ),
  "mcc-adjustment-effort-by-expert": guide(
    "Weight adjustment by expert",
    "Each bar shows the total amount of weight moved across one expert's criteria. Increases and decreases both add to the total; a longer bar means more total change, not greater agreement or a greater initial distance from the collective result.",
  ),
  "mcc-adjustment-effort-by-criterion": guide(
    "Weight adjustment by criterion",
    "Each bar shows the total amount of weight moved for one criterion across experts. Increases and decreases both add to the total, so a longer bar means more weight was changed for that criterion.",
  ),
  "two-tuple-collective-profile": guide(
    "Collective 2-tuple profile",
    "Each row is an alternative and each column is a criterion. The number and color show the collective assessment's position (β) on the ordered linguistic scale; a larger β means a higher label, not necessarily a better result for a cost criterion. Hover to see the label.",
  ),
  "two-tuple-alpha-heatmap": guide(
    "Symbolic translation α",
    "Each cell is one alternative and criterion. Its number is the signed shift (α) from the selected linguistic label: zero sits on the label, while positive or negative values place the assessment above or below it on the ordered scale. Color shows the direction and size of the shift; α is not confidence or uncertainty.",
  ),
  "two-tuple-evaluator-distance": guide(
    "Evaluator distance to collective profile",
    "Each bar represents an evaluator and measures the average gap between their assessments and the collective profile across alternatives and criteria. Shorter bars mean a closer match; zero means the displayed profiles match exactly.",
  ),
  "two-tuple-evaluator-disagreement": guide(
    "Evaluator disagreement by cell",
    "Each row is an alternative and each column is a criterion. The number and color show how far evaluators' assessments vary from the collective value in that cell; larger values mean more disagreement, not greater influence on the final ranking.",
  ),
  "two-tuple-personal-vs-collective-ranking": guide(
    "Personal vs collective ranking",
    "Rows are evaluators and columns are alternatives. Each cell compares the evaluator's rank with the collective rank: zero means the ranks match, positive means the evaluator placed it lower, and negative means higher. Rank 1 is best.",
  ),
  "two-tuple-loeo-rank-impact": guide(
    "LOEO evaluator impact",
    "Each bar shows the total number of rank places that shifted after one evaluator was temporarily left out and the collective ranking was recalculated. A longer bar means a larger change in this simulation, not greater real-world causal importance.",
  ),
  "topsis-ideal-distances": guide(
    "Distance to TOPSIS ideals",
    "Each point is an alternative. The horizontal axis is its distance from the most desirable reference, and the vertical axis is its distance from the least desirable reference. Farther left and higher means closer to the best reference and farther from the worst.",
  ),
  "topsis-collective-performance-profile": guide(
    "Collective performance by criterion",
    "Each row is an alternative and each column is a criterion. Benefit and cost labels show which direction is preferable; color and number give the alternative's relative position within that criterion's observed range. Hover for raw collective evaluations and configured weights. Each criterion is scaled separately, not as an absolute quality score.",
  ),
  "topsis-numeric-ideal-distances": guide(
    "Position relative to TOPSIS reference solutions",
    "Each point is an alternative's validated position relative to two reference profiles. Smaller D+ means closer to the most desirable profile; larger D− means farther from the least desirable one. Hover for precise values; coincident names share one point's tooltip, and nearby alternatives are listed without moving their coordinates.",
  ),
  "topsis-sort-closeness-category-boundaries": guide(
    "Closeness and category boundaries",
    "Horizontal position is each alternative's relative closeness coefficient (0–1); each row names the alternative. Dashed profiles mark boundaries in configured order, from least to most preferred. Hover for the exact coefficient, assigned category, and nearest-boundary distance. A nearby boundary does not predict reclassification.",
  ),
  "topsis-positive-distance-contributions": guide(
    "Criterion contributions to squared distance from the most desirable reference",
    "Each horizontal bar is an alternative; its colored criterion segments add to its squared distance from the most desirable reference. Larger segments show criteria where its profile is farther from that reference. This is a decomposition of squared distance, not an additive effect on relative closeness or ranking.",
  ),
  "topsis-negative-distance-contributions": guide(
    "Criterion contributions to squared distance from the least desirable reference",
    "Each horizontal bar is an alternative; its colored criterion segments add to its squared distance from the least desirable reference. Larger segments show criteria that separate it farther from that reference. This is a decomposition of squared distance, not an additive effect on relative closeness or ranking.",
  ),
  "criterion-weighted-discrimination": guide(
    "Observed discriminating power by criterion",
    "Each bar combines a criterion's assigned weight with how much its collective evaluations vary across alternatives. Longer bars mean more weighted variation in these results; they do not show what would happen if the criterion were removed.",
  ),
  "positive-distance-contributions": guide(
    "Criterion contributions to D+",
    "Each bar is an alternative, and its colored segments show how much each criterion adds to its distance from the most desirable reference. Larger segments add more distance; a shorter total bar means the alternative is closer to that reference.",
  ),
  "negative-distance-contributions": guide(
    "Criterion contributions to D−",
    "Each bar is an alternative, and its colored segments show how much each criterion adds to its distance from the least desirable reference. Larger segments add more distance; a longer total means the alternative is farther from that least desirable reference.",
  ),
  "collective-beta-heatmap": guide(
    "Collective 2-tuple positions",
    "Each row is an alternative and each column is a criterion. The number and color show the collective assessment's position (β) on that criterion's linguistic scale; a higher position means a higher input label, which may not be more desirable for a cost criterion.",
  ),
  "alpha-heatmap": guide(
    "Symbolic translation α",
    "Each cell is one alternative and criterion. Its number is the signed shift (α) from the TOPSIS collective assessment's selected linguistic label: zero sits on the label, while positive or negative values sit above or below it. Color shows the direction and size of the shift; α is not confidence or uncertainty.",
  ),
  "evaluator-alignment": guide(
    "Evaluator distance to collective profile",
    "Each bar represents an evaluator and measures the weighted gap between their assessment profile and the TOPSIS collective profile. Shorter bars mean closer profiles, and zero means they match; the bar does not measure how influential that evaluator is.",
  ),
  "evaluator-disagreement-heatmap": guide(
    "Evaluator disagreement by cell",
    "Each row is an alternative and each column is a criterion. The number and color show how much evaluator assessments vary around the TOPSIS collective value in that cell; larger values mean more disagreement, not a larger effect on the result.",
  ),
  "loeo-rank-impact": guide(
    "LOEO technical-rank impact",
    "Each bar shows the total number of rank places that shifted after one evaluator was temporarily removed, the remaining weights were adjusted, and TOPSIS was recalculated. A longer bar means a larger simulated change, not real-world causal importance.",
  ),
  "loco-rank-impact": guide(
    "LOCO technical-rank impact",
    "Each bar shows the total number of rank places that shifted after one criterion was temporarily removed, the remaining weights were adjusted, and TOPSIS was recalculated. A longer bar means a larger simulated change, not real-world causal importance.",
  ),
});

export const GENERIC_VISUALIZATION_READING_GUIDES = Object.freeze({
  alternativeRelationships: guide(
    "Alternative relationships",
    "Each cell compares two alternatives' recorded scores relative to the observed score range for this execution. Zero means equal recorded scores; one spans the full observed range. Larger values indicate greater score separation, not a percentage of superiority or preference. Compare phases within this execution; do not compare values across executions or models.",
  ),
  rankingEvolution: guide(
    "Ranking evolution",
    "Each colored line follows one alternative across phases from left to right. The vertical position is its rank: 1 is best, so moving toward a smaller number means it rose in the ranking and a larger number means it fell.",
  ),
  rankingStability: guide(
    "Ranking stability",
    "Each row summarizes one alternative across recorded phases. The arrows show its starting and ending rank; Best and Worst show the smallest and largest rank numbers reached. Rank 1 is best, and total movement adds its rank changes between phases.",
  ),
  rankingAgreement: guide(
    "Ranking similarity between rounds",
    "Each marker compares the rank order in two neighboring rounds. A value near 1 means the order stayed alike, near −1 means it reversed, and near 0 means the ranks have little consistent relationship; the label names the rounds.",
  ),
});

const DYNAMIC_GUIDES = [
  [
    "two-tuple-criterion-weight-sensitivity-",
    guide(
      "Criterion weight sensitivity",
      "Each line follows an alternative's final linguistic position (β) as the selected criterion's importance is varied. The horizontal axis is the tested weight; other weights are redistributed proportionally. Higher β means a higher label, not always more desirable for cost criteria; points are sampled, not exact thresholds.",
    ),
  ],
  [
    "two-tuple-expert-weight-sensitivity-",
    guide(
      "Evaluator weight sensitivity",
      "Each line follows an alternative's final linguistic position (β) as the selected evaluator's importance is varied. The horizontal axis is the tested weight; other weights are redistributed proportionally. Higher β means a higher label, not always more desirable for cost criteria; points are sampled, not exact thresholds.",
    ),
  ],
  [
    "criterion-weight-sensitivity-",
    guide(
      "Criterion weight sensitivity",
      "Each line follows an alternative's TOPSIS closeness as the selected criterion's importance is varied. The horizontal axis is the tested weight and the vertical axis is closeness; higher closeness means nearer the most desirable reference. Other weights are redistributed proportionally, and points are sampled rather than exact thresholds.",
    ),
  ],
  [
    "evaluator-weight-sensitivity-",
    guide(
      "Evaluator weight sensitivity",
      "Each line follows an alternative's TOPSIS closeness as the selected evaluator's importance is varied. The horizontal axis is the tested weight and the vertical axis is closeness; higher closeness means nearer the most desirable reference. Other weights are redistributed proportionally, and points are sampled rather than exact thresholds.",
    ),
  ],
  [
    "topsis-sort-criterion-weight-sensitivity-",
    guide(
      "Criterion weight sensitivity",
      "Changing a criterion's weight shows how alternatives move relative to category boundaries. Solid lines represent alternatives; dashed lines show the boundaries. Crossing a boundary can change the classification.",
    ),
  ],
];

const FALLBACK_GUIDE = "Use the chart labels, legend, and tooltips to see what each mark represents and how the displayed values compare.";
const nonEmptyText = (value) => typeof value === "string" && value.trim() ? value.trim() : null;

export const getVisualizationReadingGuide = (visualization) => {
  if (!visualization || typeof visualization !== "object" || Array.isArray(visualization)) {
    return guide("Visualization", FALLBACK_GUIDE);
  }

  const key = nonEmptyText(visualization.key);
  const exactGuide = key ? MODEL_VISUALIZATION_READING_GUIDES[key] : null;
  if (exactGuide) return exactGuide;

  const dynamicGuide = key
    ? DYNAMIC_GUIDES.find(([prefix]) => key.startsWith(prefix) && key.length > prefix.length)?.[1]
    : null;
  if (dynamicGuide) return dynamicGuide;

  const semanticGuide = GENERIC_VISUALIZATION_READING_GUIDES[visualization.type];
  if (semanticGuide) return semanticGuide;

  return guide(
    nonEmptyText(visualization.title) || "Visualization",
    nonEmptyText(visualization.description) || FALLBACK_GUIDE,
  );
};

export default getVisualizationReadingGuide;
