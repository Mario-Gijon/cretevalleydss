export const formatConsensusRoundLabel = (consensusPhase) =>
  consensusPhase === 0 ? "Initial round" : `Round ${consensusPhase}`;
