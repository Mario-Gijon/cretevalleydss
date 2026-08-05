const isFiniteScore = (score) => typeof score === "number" && Number.isFinite(score);

export const formatNormalizedScore = (score) =>
  isFiniteScore(score) ? Number(score.toFixed(4)).toString() : "—";

export const normalizeRankingScores = (ranking = []) => {
  const finiteScores = ranking.map((entry) => entry?.score).filter(isFiniteScore);
  const minimumScore = finiteScores.length ? Math.min(...finiteScores) : null;
  const maximumScore = finiteScores.length ? Math.max(...finiteScores) : null;
  const hasEqualFiniteScores = minimumScore !== null && minimumScore === maximumScore;

  return ranking.map((entry) => {
    if (!isFiniteScore(entry?.score) || minimumScore === null) {
      return { ...entry, score: null, formattedScore: "—" };
    }

    const score = hasEqualFiniteScores ? 1 : (entry.score - minimumScore) / (maximumScore - minimumScore);
    return { ...entry, score, formattedScore: formatNormalizedScore(score) };
  });
};

export default normalizeRankingScores;
