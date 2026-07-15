import { buildOverviewData } from "../../overview/logic/buildFinishedIssueOverviewData.js";
import { buildResultsAnalysisData } from "../../../shared/logic/buildFinishedIssueResultsAnalysisData.js";
import { buildConsensusData } from "../../consensus/logic/buildConsensusData.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

export const buildDashboardData = ({ payload, selectedExecution, selectedPhase, evaluations }) => {
  const overview = buildOverviewData(payload);
  const resultsAnalysis = buildResultsAnalysisData({ payload, selectedExecution, selectedPhase });
  const consensus = buildConsensusData(payload);
  const canonicalEvaluationPhase = selectedPhase ?? asArray(payload?.phaseResults)
    .filter((result) => result?.stage === "alternativeEvaluation")
    .sort((left, right) => right.phase - left.phase)[0]?.phase ?? null;

  return {
    issue: {
      id: overview.issue.id,
      name: overview.issue.name,
      description: overview.description,
      owner: overview.general.owner,
      creationDate: overview.general.creationDate,
      closureDate: overview.general.closureDate,
      alternativesCount: overview.counts.alternatives,
      criteriaCount: overview.counts.criteria,
      participatingExpertsCount: overview.experts.participated.length,
    },
    resultsAnalysis: {
      ...resultsAnalysis,
      outcome: { ...resultsAnalysis.outcome, topRanking: resultsAnalysis.outcome.ranking.slice(0, 3) },
    },
    evaluations: {
      expertsCount: asArray(evaluations?.expertOptions).length,
      phaseLabel: canonicalEvaluationPhase === null ? "—" : `Phase ${canonicalEvaluationPhase}`,
      structure: evaluations?.structureKey || null,
      hasCollective: evaluations?.canShowCollective === true,
      hasCriteriaWeights: payload?.configuration?.criteriaWeighting?.required === true,
    },
    models: {
      baseModelName: payload?.models?.base?.name || "—",
      selectedExecutionKey: selectedExecution?.key || "base",
      selectedExecutionLabel: selectedExecution?.label || "Base",
      selectedExecutionIsBase: selectedExecution?.type !== "scenario",
      additionalRunsCount: asArray(payload?.scenarios).length,
    },
    consensus: consensus.enabled ? {
      phasesCount: consensus.rounds.length,
      phaseLabel: consensus.finalPhase === null ? "—" : `Phase ${consensus.finalPhase}`,
      threshold: consensus.threshold,
      finalMeasure: consensus.series.at(-1)?.measure ?? null,
      finalizationReason: consensus.finalizationReason,
      reachedPhase: consensus.reachedPhase,
      consensusEvolutionData: {
        labels: consensus.series.map((entry) => `Phase ${entry.phase}`),
        data: consensus.series.map((entry) => entry.measure),
      },
    } : null,
  };
};

export default buildDashboardData;
