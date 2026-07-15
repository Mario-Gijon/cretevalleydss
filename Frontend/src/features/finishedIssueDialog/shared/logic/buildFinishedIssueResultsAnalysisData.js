import { normalizePlotsGraphic } from "./buildFinishedIssueGraphs.js";
import { formatFinishedIssuePhaseLabel } from "../../logic/formatFinishedIssuePhaseLabel.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

export const buildResultsAnalysisData = ({ payload, selectedExecution, selectedPhase }) => {
  const execution = selectedExecution || {};
  const phases = asArray(execution.phaseResults).map((result) => result?.phase).filter(Number.isInteger);
  const phase = execution.type === "base" && phases.includes(selectedPhase)
    ? selectedPhase
    : execution.sourcePhase;
  const result = execution.type === "base"
    ? asArray(execution.phaseResults).find((entry) => entry?.phase === phase) || null
    : null;
  const standard = execution.type === "base"
    ? result?.standardizedOutput || execution.standardizedOutput || {}
    : execution.standardizedOutput || {};
  const ranking = asArray(standard.rankedAlternatives);
  const alternatives = new Map(asArray(payload?.alternatives).map((alternative) => [alternative?.id, alternative]));
  const normalizedRanking = ranking.map((entry, index) => {
    const alternative = alternatives.get(entry?.alternativeId);
    return {
      id: entry?.alternativeId || `ranking-${index}`,
      name: alternative?.name || entry?.name || "—",
      description: alternative?.description || "",
      score: entry?.score ?? null,
      formattedScore: entry?.score === null || entry?.score === undefined ? "" : String(entry.score),
      position: Number.isInteger(entry?.rank) ? entry.rank : index + 1,
    };
  });
  const normalizedPlots = normalizePlotsGraphic(standard?.plotsGraphic);
  const hasOutputs = execution.type === "base" || Boolean(execution?.scenario?.outputs && execution?.scenario?.status !== "error");

  return {
    context: {
      executionLabel: execution.label || "—",
      phaseLabel: execution.type === "base"
        ? formatFinishedIssuePhaseLabel({ phase, orderedPhases: phases })
        : execution.sourcePhase === null || execution.sourcePhase === undefined
          ? "Scenario execution"
          : `Source phase ${execution.sourcePhase}`,
      sourcePhase: execution.sourcePhase ?? null,
      availablePhases: phases,
    },
    outcome: {
      available: hasOutputs && normalizedRanking.length > 0,
      unavailableReason: hasOutputs ? null : execution?.scenario?.error || "Scenario output is unavailable.",
      winner: normalizedRanking[0] || null,
      ranking: normalizedRanking,
      consensusMeasure: standard?.consensusMeasure ?? null,
      modelSpecificOutput: execution.modelSpecificOutput ?? null,
      rawOutput: execution.rawOutput ?? null,
    },
    visualizations: {
      hasPerformanceMap: Boolean(normalizedPlots?.isValid),
      performanceMapData: normalizedPlots?.isValid ? [{
        expertPoints: normalizedPlots.expertPoints,
        collectivePoint: normalizedPlots.collectivePoint,
      }] : null,
      selectedPhase: phase ?? null,
      unavailableReason: normalizedPlots?.reason || null,
    },
    interpretation: { available: false },
  };
};

export default buildResultsAnalysisData;
