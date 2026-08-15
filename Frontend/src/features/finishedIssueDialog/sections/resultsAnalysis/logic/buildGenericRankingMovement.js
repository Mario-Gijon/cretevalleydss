import { formatFinishedIssuePhaseLabel } from "../../../logic/formatFinishedIssuePhaseLabel.js";

export const buildGenericRankingMovement = (visualization) => {
  const data = visualization?.data;
  const phases = Array.isArray(data?.phases) ? data.phases : [];
  const series = Array.isArray(data?.series) ? data.series : [];
  const executions = phases.map((phase) => ({
    key: String(phase),
    label: formatFinishedIssuePhaseLabel({ phase, orderedPhases: phases }),
  }));
  const alternatives = series.map((entry) => ({
    id: entry.alternativeId,
    name: entry.label || entry.alternativeId,
    positions: (entry.values || []).map((position) => ({ position })),
  }));
  const maxPosition = Math.max(
    1,
    ...alternatives.flatMap((entry) => entry.positions.map((item) => item.position || 0))
  );
  return {
    available: executions.length > 0 && alternatives.length > 0,
    reason: "Ranking evolution is not available.",
    executions,
    alternatives,
    maxPosition,
  };
};
