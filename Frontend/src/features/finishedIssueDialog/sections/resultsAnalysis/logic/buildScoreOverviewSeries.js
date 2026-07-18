import { PERFORMANCE_BAR_TOKENS } from "../../../shared/logic/chartVisualTokens.js";

export const SCORE_WINNER_TOLERANCE = 1e-9;

export const formatOriginalScore = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(4)).toString()
    : "—";

export const buildScoreOverviewSeries = (ranking = []) => {
  const scores = ranking.map((entry) => entry?.score);
  const finiteScores = scores.filter((score) => typeof score === "number" && Number.isFinite(score));
  const highestScore = finiteScores.length ? Math.max(...finiteScores) : null;
  return ranking.map((entry, index) => {
    const score = scores[index];
    const isWinner = highestScore !== null
      && typeof score === "number"
      && Number.isFinite(score)
      && Math.abs(score - highestScore) <= SCORE_WINNER_TOLERANCE;
    return {
      id: `score-${entry?.id || index}`,
      stack: "original-scores",
      label: entry?.name || `Alternative ${index + 1}`,
      color: isWinner ? PERFORMANCE_BAR_TOKENS.winnerFill : PERFORMANCE_BAR_TOKENS.standardFill,
      data: scores.map((value, dataIndex) => dataIndex === index && typeof value === "number" && Number.isFinite(value) ? value : null),
      valueFormatter: formatOriginalScore,
    };
  });
};

export default buildScoreOverviewSeries;
