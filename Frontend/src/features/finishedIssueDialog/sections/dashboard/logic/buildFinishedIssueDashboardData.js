export const buildDashboardData = ({ overview, evaluations, results, consensus, models }) => ({
  issue: overview,
  resultsAnalysis: {
    ...results,
    outcome: { ...results.outcome, topRanking: results.outcome.ranking.slice(0, 3) },
  },
  evaluations,
  models,
  consensus,
});

export default buildDashboardData;
