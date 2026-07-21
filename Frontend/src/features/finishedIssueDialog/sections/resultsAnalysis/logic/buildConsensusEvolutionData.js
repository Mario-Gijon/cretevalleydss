import { formatFinishedIssuePhaseLabel } from "../../../logic/formatFinishedIssuePhaseLabel.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

export const buildConsensusEvolutionData = (payload) => {
  const consensus = payload?.consensus || {};
  const phaseById = new Map(asArray(payload?.phaseResults).map((result) => [result?.id, result]));
  const rounds = asArray(consensus.rounds)
    .map((round) => ({ ...round, phaseResult: phaseById.get(round?.phaseResultId) || null }))
    .sort((left, right) => (left.phase ?? 0) - (right.phase ?? 0));
  const orderedPhases = rounds.map((round) => round.phase).filter(Number.isInteger);
  const series = rounds.map((round) => ({
    phase: round.phase,
    measure: round.phaseResult?.consensusMeasure ?? null,
    ranking: round.phaseResult?.rankedAlternatives || [],
    collectiveEvaluationId: round.phaseResult?.collectiveEvaluationId ?? null,
    expertWeightSnapshot: round.phaseResult?.expertWeightSnapshot || [],
  }));

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
    series,
    graph: {
      labels: series.map((entry) => formatFinishedIssuePhaseLabel({ phase: entry.phase, orderedPhases })),
      data: series.map((entry) => entry.measure),
    },
  };
};

export const buildConsensusEvolutionPreview = (data) => data.enabled ? {
  phasesCount: data.rounds.length,
  phaseLabel: data.finalPhase === null ? "—" : formatFinishedIssuePhaseLabel({ phase: data.finalPhase, orderedPhases: data.rounds.map((round) => round.phase) }),
  finalPhase: data.finalPhase,
  threshold: data.threshold,
  finalMeasure: data.series.at(-1)?.measure ?? null,
  finalizationReason: data.finalizationReason,
  reachedPhase: data.reachedPhase,
  consensusEvolutionData: data.graph,
} : null;

export default buildConsensusEvolutionData;
