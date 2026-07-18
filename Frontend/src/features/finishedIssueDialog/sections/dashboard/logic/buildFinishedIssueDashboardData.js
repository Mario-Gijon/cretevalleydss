export const buildDashboardData = ({ overview, evaluations, results, consensus, models }) => {
  const winner = results.outcome.winner;
  const resultPhase = results.context.phaseLabel || "Final";
  const alternativesCount = overview.alternatives?.length || 0;
  const hasMoreThanThreeAlternatives = alternativesCount > 3;

  return {
    kpis: {
      winner: winner ? { alternativeId: winner.id, name: winner.name, score: winner.score, formattedScore: winner.formattedScore } : null,
      consensus: { enabled: Boolean(consensus), label: consensus ? "Enabled" : "Disabled" },
      phase: consensus
        ? { label: consensus.phaseLabel, current: consensus.finalPhase, total: consensus.phasesCount }
        : { label: resultPhase, current: null, total: null },
    },
    overview,
    resultsAnalysis: {
      ...results,
      outcome: { ...results.outcome, topRanking: results.outcome.ranking.slice(0, 3) },
      alternativesCount,
      rankingTitle: hasMoreThanThreeAlternatives ? "Top 3 ranking" : "Ranking",
      performanceTitle: hasMoreThanThreeAlternatives ? "Top 3 performance overview" : "Performance overview",
    },
    evaluations,
    models,
  };
};

export default buildDashboardData;
