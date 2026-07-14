import { getFinishedIssueGraphAvailability } from "./buildFinishedIssueGraphs";

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (typeof value === "string" ? value : "");

export const buildFinishedIssueOverviewData = ({
  viewIssue,
  ranking,
  formatScore,
  currentPhaseLabel,
  currentPhaseIndex,
  expertList,
  evaluationStructure,
  canShowCollective,
  criteriaWeightsPayload,
  selectedModelName,
  selectedRunKey,
  selectedRunLabel,
  runs,
  roundsCount,
}) => {
  const summary = viewIssue?.summary || {};
  const alternatives = asArray(summary.alternatives);
  const graphAvailability = getFinishedIssueGraphAvailability(viewIssue);
  const normalizedRanking = asArray(ranking).slice(0, 3).map((item, index) => {
    const name = asText(item?.name) || "—";
    const matchingAlternative = alternatives.find((alternative) =>
      typeof alternative === "object" &&
      (String(alternative?.id || alternative?._id || "") === String(item?.alternativeId || item?.id || "") || alternative?.name === name)
    );
    return {
      id: item?.alternativeId || item?.id || matchingAlternative?.id || matchingAlternative?._id || `${name}-${index}`,
      name,
      description: asText(matchingAlternative?.description),
      score: item?.score,
      formattedScore: item?.score === undefined ? "" : formatScore?.(item.score) ?? String(item.score),
    };
  });
  const consensusInfo = summary.consensusInfo;
  const performanceMapData = viewIssue?.analyticalGraphs?.scatterPlot ||
    (graphAvailability.normalizedPlots?.isValid ? [{
      expertPoints: graphAvailability.normalizedPlots.expertPoints,
      collectivePoint: graphAvailability.normalizedPlots.collectivePoint,
    }] : null);

  return {
    issue: {
      id: summary?.id || viewIssue?.id || viewIssue?._id || null,
      name: asText(summary.name), description: asText(summary.description), owner: asText(summary.owner),
      creationDate: summary.creationDate ?? null, closureDate: summary.closureDate ?? null,
      alternativesCount: alternatives.length, criteriaCount: asArray(summary.criteria).length,
      participatingExpertsCount: asArray(summary.experts?.participated).length,
    },
    results: { available: normalizedRanking.length > 0, phaseLabel: currentPhaseLabel, items: normalizedRanking },
    analysis: { available: false },
    evaluations: { expertsCount: asArray(expertList).length, phaseLabel: currentPhaseLabel, structure: evaluationStructure || null, hasCollective: Boolean(canShowCollective), hasCriteriaWeights: Boolean(criteriaWeightsPayload) },
    graphs: { ...graphAvailability, performanceMapData, consensusEvolutionData: viewIssue?.analyticalGraphs?.consensusLevelLineChart || null, selectedPhaseIndex: currentPhaseIndex, unavailableReason: graphAvailability.normalizedPlots?.reason || null },
    models: { baseModelName: selectedModelName || "—", selectedExecutionKey: selectedRunKey || "base", selectedExecutionLabel: selectedRunKey === "base" ? "Base" : selectedRunLabel || "Scenario", selectedExecutionIsBase: selectedRunKey === "base", additionalRunsCount: asArray(runs).length },
    consensus: consensusInfo ? { phasesCount: roundsCount, phaseLabel: currentPhaseLabel, threshold: consensusInfo.threshold ?? null, finalMeasure: consensusInfo.finalConsensusMeasure ?? null, finalizationReason: consensusInfo.finalizationReason ?? null, reachedPhase: consensusInfo.consensusReachedPhase ?? null } : null,
  };
};
