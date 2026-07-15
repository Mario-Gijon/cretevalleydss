const asArray = (value) => (Array.isArray(value) ? value : []);

export const buildConsensusData = (payload) => {
  const consensus = payload?.consensus || {};
  const phaseById = new Map(asArray(payload?.phaseResults).map((result) => [result?.id, result]));
  const rounds = asArray(consensus.rounds)
    .map((round) => ({ ...round, phaseResult: phaseById.get(round?.phaseResultId) || null }))
    .sort((left, right) => (left.phase ?? 0) - (right.phase ?? 0));

  return {
    enabled: consensus.enabled === true,
    supported: consensus.modelSupportsConsensus === true,
    simulated: consensus.simulated === true,
    maxPhases: consensus.maxPhases ?? null,
    threshold: consensus.threshold ?? null,
    finalPhase: consensus.finalPhase ?? null,
    reachedPhase: consensus.reachedPhase ?? null,
    finalizationReason: consensus.finalizationReason ?? null,
    rounds,
    series: rounds.map((round) => ({
      phase: round.phase,
      measure: round.phaseResult?.consensusMeasure ?? null,
      ranking: round.phaseResult?.rankedAlternatives || [],
      collectiveEvaluationId: round.phaseResult?.collectiveEvaluationId ?? null,
      expertWeightSnapshot: round.phaseResult?.expertWeightSnapshot || [],
    })),
  };
};

export const buildConsensusPreview = (data) => data.enabled ? {
  phasesCount: data.rounds.length,
  phaseLabel: data.finalPhase === null ? "—" : `Phase ${data.finalPhase}`,
  threshold: data.threshold,
  finalMeasure: data.series.at(-1)?.measure ?? null,
  finalizationReason: data.finalizationReason,
  reachedPhase: data.reachedPhase,
  consensusEvolutionData: { labels: data.series.map((entry) => `Phase ${entry.phase}`), data: data.series.map((entry) => entry.measure) },
} : null;

export default buildConsensusData;
