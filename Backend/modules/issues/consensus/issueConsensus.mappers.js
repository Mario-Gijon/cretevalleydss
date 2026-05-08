const toArrayOrFallback = (value, fallback = []) =>
  Array.isArray(value) ? value : fallback;

export const mapConsensusDocToHistoryRound = (consensusDoc) => {
  const details = consensusDoc?.details || {};
  const rankedAlternatives = toArrayOrFallback(details.rankedAlternatives, []);
  const rankedWithScores = toArrayOrFallback(
    details.rankedWithScores,
    rankedAlternatives
  );

  return {
    phase: consensusDoc?.phase ?? null,
    computedAt: consensusDoc?.timestamp ?? null,
    consensusLevel: consensusDoc?.level ?? null,
    rankedAlternatives,
    rankedWithScores,
    collectiveEvaluations: consensusDoc?.collectiveEvaluations ?? null,
    feedback: details?.feedback ?? null,
    recommendations: details?.recommendations ?? null,
    modelExecution: details?.modelExecution ?? null,
  };
};

export const buildConsensusHistoryFromDocs = (consensusDocs) =>
  toArrayOrFallback(consensusDocs)
    .slice()
    .sort((left, right) => Number(left?.phase || 0) - Number(right?.phase || 0))
    .map((doc) => mapConsensusDocToHistoryRound(doc));
