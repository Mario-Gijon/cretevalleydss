const mapConsensusDocToHistoryRound = (consensusDoc) => {
  const details = consensusDoc.details;
  const rankedAlternatives = details.rankedAlternatives;
  const rankedWithScores = details.rankedWithScores;

  return {
    phase: consensusDoc.phase,
    computedAt: consensusDoc.timestamp,
    consensusLevel: consensusDoc.level,
    rankedAlternatives,
    rankedWithScores,
    collectiveEvaluations: consensusDoc.collectiveEvaluations,
    feedback: details.feedback,
    recommendations: details.recommendations,
    modelExecution: details.modelExecution,
  };
};

export const buildConsensusHistoryFromDocs = (consensusDocs) => {
  return consensusDocs
    .slice()
    .sort((left, right) => left.phase - right.phase)
    .map((doc) => mapConsensusDocToHistoryRound(doc));
};
