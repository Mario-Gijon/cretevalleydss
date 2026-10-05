const asArray = (value) => (Array.isArray(value) ? value : []);

export const formatFinishedIssueScore = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(4)).toString();
};

export const normalizeFinishedIssueRanking = (rankedAlternatives, alternatives) => {
  const alternativeById = new Map(asArray(alternatives).map((alternative) => [alternative?.id, alternative]));
  return asArray(rankedAlternatives).map((entry, index) => {
    const alternative = alternativeById.get(entry?.alternativeId);
    const score = typeof entry?.score === "number" && Number.isFinite(entry.score) ? entry.score : null;
    return {
      id: entry?.alternativeId || `ranking-${index}`,
      name: alternative?.name || entry?.name || "—",
      description: alternative?.description || "",
      score,
      formattedScore: formatFinishedIssueScore(score),
      position: Number.isInteger(entry?.rank) ? entry.rank : index + 1,
    };
  });
};
