export const formatFinishedIssuePhaseLabel = ({ phase, orderedPhases, phaseIndex, phasesCount }) => {
  const phases = Array.isArray(orderedPhases)
    ? orderedPhases.filter(Number.isInteger).slice().sort((left, right) => left - right)
    : null;
  const index = phases ? phases.indexOf(phase) : Number(phaseIndex);
  const count = phases ? phases.length : Number(phasesCount);

  if (!Number.isInteger(index) || index < 0 || !Number.isInteger(count) || count < 1) {
    return "Final";
  }
  if (count === 1) return "Final";
  if (index === count - 1) return `Final (Round ${index})`;
  if (index === 0) return "Initial";
  return `Round ${index}`;
};
