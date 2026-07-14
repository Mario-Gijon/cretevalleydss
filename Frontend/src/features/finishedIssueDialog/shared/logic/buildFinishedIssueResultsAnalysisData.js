import { getFinishedIssueGraphAvailability } from "./buildFinishedIssueGraphs";

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (typeof value === "string" ? value : "");

export const buildFinishedIssueResultsAnalysisData = ({
  viewIssue,
  ranking,
  formatScore,
  currentPhaseIndex,
  currentPhaseLabel,
  executionLabel,
}) => {
  const alternatives = asArray(viewIssue?.summary?.alternatives);
  const graphAvailability = getFinishedIssueGraphAvailability(viewIssue);
  const normalizedRanking = asArray(ranking).map((entry, index) => {
    const name = asText(entry?.name) || "—";
    const alternative = alternatives.find((candidate) =>
      typeof candidate === "object" &&
      (String(candidate?.id || candidate?._id || "") === String(entry?.alternativeId || entry?.id || "") ||
        candidate?.name === name)
    );

    return {
      id: entry?.alternativeId || entry?.id || alternative?.id || alternative?._id || `${name}-${index}`,
      name,
      description: asText(alternative?.description),
      score: entry?.score,
      formattedScore: entry?.score === undefined ? "" : formatScore?.(entry.score) ?? String(entry.score),
      position: Number.isInteger(entry?.rank) ? entry.rank : index + 1,
    };
  });
  const performanceMapData = viewIssue?.analyticalGraphs?.scatterPlot ||
    (graphAvailability.normalizedPlots?.isValid
      ? [{
          expertPoints: graphAvailability.normalizedPlots.expertPoints,
          collectivePoint: graphAvailability.normalizedPlots.collectivePoint,
        }]
      : null);

  return {
    context: {
      executionLabel: executionLabel || "—",
      phaseLabel: currentPhaseLabel || "Final",
    },
    outcome: {
      available: normalizedRanking.length > 0,
      winner: normalizedRanking[0] || null,
      ranking: normalizedRanking,
    },
    visualizations: {
      hasPerformanceMap: Boolean(graphAvailability.hasPerformanceMap && performanceMapData),
      performanceMapData,
      selectedPhaseIndex: currentPhaseIndex,
      unavailableReason: graphAvailability.normalizedPlots?.reason || null,
    },
    interpretation: { available: false },
  };
};
