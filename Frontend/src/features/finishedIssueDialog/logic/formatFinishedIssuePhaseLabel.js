export const formatFinishedIssuePhaseLabel = ({ phaseIndex, phasesCount }) => {
  const index = Number(phaseIndex);
  const count = Number(phasesCount);

  if (!Number.isInteger(index) || index < 0 || !Number.isInteger(count) || count < 1) {
    return "Final";
  }
  if (count === 1) return "Final";
  if (index === count - 1) return `Final (Round ${index})`;
  if (index === 0) return "Initial";
  return `Round ${index}`;
};
