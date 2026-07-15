const formatPercentage = (completed, total) =>
  total > 0 ? `${Math.round((completed / total) * 100)}%` : "—";

export const buildDashboardData = ({ overview, evaluations, results, consensus, models }) => {
  const winner = results.outcome.winner;
  const accepted = overview.acceptedParticipantsCount;
  const completed = overview.completedAlternativeEvaluationsCount;
  const resultPhase = results.context.phaseLabel || "Final";

  return {
    kpis: {
      winner: winner ? { alternativeId: winner.id, name: winner.name, score: winner.score, formattedScore: winner.formattedScore } : null,
      evaluationCoverage: accepted > 0 ? {
        completed,
        total: accepted,
        formattedPercentage: formatPercentage(completed, accepted),
      } : null,
      consensus: { enabled: Boolean(consensus), label: consensus ? "Enabled" : "Disabled" },
      phase: consensus
        ? { label: consensus.phaseLabel, current: consensus.finalPhase, total: consensus.phasesCount }
        : { label: resultPhase, current: null, total: null },
    },
    overview,
    resultsAnalysis: {
      ...results,
      outcome: { ...results.outcome, topRanking: results.outcome.ranking.slice(0, 3) },
    },
    evaluations,
    models,
  };
};

export default buildDashboardData;
