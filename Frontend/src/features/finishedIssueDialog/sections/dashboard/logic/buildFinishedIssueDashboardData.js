import { getFinishedIssueGraphAvailability } from "../../../shared/logic/buildFinishedIssueGraphs";
import { buildFinishedIssueResultsAnalysisData } from "../../../shared/logic/buildFinishedIssueResultsAnalysisData";

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (typeof value === "string" ? value : "");

export const buildFinishedIssueDashboardData = ({
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
  const graphAvailability = getFinishedIssueGraphAvailability(viewIssue);
  const alternatives = asArray(summary.alternatives);
  const resultsAnalysis = buildFinishedIssueResultsAnalysisData({
    viewIssue,
    ranking,
    formatScore,
    currentPhaseIndex,
    currentPhaseLabel,
    executionLabel: selectedRunLabel,
  });
  const consensusInfo = summary.consensusInfo;
  return {
    issue: {
      id: summary.id || viewIssue?.id || viewIssue?._id || null,
      name: asText(summary.name),
      description: asText(summary.description),
      owner: asText(summary.owner),
      creationDate: summary.creationDate ?? null,
      closureDate: summary.closureDate ?? null,
      alternativesCount: alternatives.length,
      criteriaCount: asArray(summary.criteria).length,
      participatingExpertsCount: asArray(summary.experts?.participated).length,
    },
    resultsAnalysis: {
      context: resultsAnalysis.context,
      outcome: {
        available: resultsAnalysis.outcome.available,
        winner: resultsAnalysis.outcome.winner,
        topRanking: resultsAnalysis.outcome.ranking.slice(0, 3),
      },
      visualizations: {
        hasPerformanceMap: resultsAnalysis.visualizations.hasPerformanceMap,
        performanceMapData: resultsAnalysis.visualizations.performanceMapData,
        selectedPhaseIndex: resultsAnalysis.visualizations.selectedPhaseIndex,
        unavailableReason: resultsAnalysis.visualizations.unavailableReason,
      },
      interpretation: resultsAnalysis.interpretation,
    },
    evaluations: {
      expertsCount: asArray(expertList).length,
      phaseLabel: currentPhaseLabel,
      structure: evaluationStructure || null,
      hasCollective: Boolean(canShowCollective),
      hasCriteriaWeights: Boolean(criteriaWeightsPayload),
    },
    models: {
      baseModelName: selectedModelName || "—",
      selectedExecutionKey: selectedRunKey || "base",
      selectedExecutionLabel: selectedRunKey === "base" ? "Base" : selectedRunLabel || "Scenario",
      selectedExecutionIsBase: selectedRunKey === "base",
      additionalRunsCount: asArray(runs).length,
    },
    consensus: consensusInfo ? {
      phasesCount: roundsCount,
      phaseLabel: currentPhaseLabel,
      threshold: consensusInfo.threshold ?? null,
      finalMeasure: consensusInfo.finalConsensusMeasure ?? null,
      finalizationReason: consensusInfo.finalizationReason ?? null,
      reachedPhase: consensusInfo.consensusReachedPhase ?? null,
      consensusEvolutionData: graphAvailability.hasConsensusEvolution
        ? viewIssue?.analyticalGraphs?.consensusLevelLineChart || null
        : null,
    } : null,
  };
};
