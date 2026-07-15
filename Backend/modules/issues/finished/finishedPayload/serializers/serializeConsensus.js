const latestAlternativeResult = (phaseResults) =>
  phaseResults
    .filter((result) => result.stage === "alternativeEvaluation")
    .sort((left, right) => right.phase - left.phase)[0] || null;

export const serializeConsensus = ({ issue, phaseResults }) => {
  if (issue.isConsensus !== true) {
    return {
      enabled: false,
      modelSupportsConsensus: issue.supportsConsensus === true,
      simulated: issue.simulateConsensus === true,
      maxPhases: issue.consensusMaxPhases ?? null,
      threshold: issue.consensusThreshold ?? null,
      finalPhase: issue.consensusPhase ?? null,
      reachedPhase: null,
      finalizationReason: null,
      rounds: [],
    };
  }

  const rounds = phaseResults
    .filter((result) => result.stage === "alternativeEvaluation")
    .map((result) => ({ phase: result.phase, phaseResultId: result.id }));
  const latest = latestAlternativeResult(phaseResults);
  const lifecycle = latest?.modelSpecificOutput?.consensusLifecycle || null;
  const reached = rounds.find((round) => {
    const result = phaseResults.find((candidate) => candidate.id === round.phaseResultId);
    return result?.modelSpecificOutput?.consensusLifecycle?.consensusReached === true ||
      (typeof issue.consensusThreshold === "number" &&
        typeof result?.consensusMeasure === "number" &&
        result.consensusMeasure >= issue.consensusThreshold);
  });

  return {
    enabled: true,
    modelSupportsConsensus: issue.supportsConsensus === true,
    simulated: issue.simulateConsensus === true,
    maxPhases: issue.consensusMaxPhases ?? null,
    threshold: issue.consensusThreshold ?? null,
    finalPhase: issue.consensusPhase ?? null,
    reachedPhase: reached?.phase ?? null,
    finalizationReason: lifecycle?.finalizationReason ?? null,
    rounds,
  };
};
