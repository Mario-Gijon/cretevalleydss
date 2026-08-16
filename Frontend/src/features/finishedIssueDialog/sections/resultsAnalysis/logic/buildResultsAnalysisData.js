import { normalizePlotsGraphic } from "../../../shared/logic/buildFinishedIssueGraphs.js";
import { formatFinishedIssuePhaseLabel } from "../../../logic/formatFinishedIssuePhaseLabel.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

const formatScore = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(4)).toString();
};

export const buildResultsAnalysisData = ({ payload, selectedExecution, selectedPhase }) => {
  const execution = selectedExecution || {};
  const phases = asArray(execution.phaseResults).map((result) => result?.phase).filter(Number.isInteger);
  const phase = phases.includes(selectedPhase) ? selectedPhase : execution.sourcePhase;
  const result = asArray(execution.phaseResults).find((entry) => entry?.phase === phase) || null;
  const standard = result?.standardizedOutput || execution.standardizedOutput || {};
  const alternatives = new Map(asArray(payload?.alternatives).map((alternative) => [alternative?.id, alternative]));
  const normalizedRanking = asArray(standard.rankedAlternatives).map((entry, index) => {
    const alternative = alternatives.get(entry?.alternativeId);
    return { id: entry?.alternativeId || `ranking-${index}`, name: alternative?.name || entry?.name || "—", description: alternative?.description || "", score: entry?.score ?? null, formattedScore: formatScore(entry?.score), position: Number.isInteger(entry?.rank) ? entry.rank : index + 1 };
  });
  const normalizedPlots = normalizePlotsGraphic(standard?.plotsGraphic);
  const unavailableReason = !result
    ? "No stored result is available for the selected phase."
    : !normalizedRanking.length ? "The selected result does not contain a ranking." : null;

  return {
    context: { executionLabel: execution.label || "—", phaseLabel: formatFinishedIssuePhaseLabel({ phase, orderedPhases: phases }), sourcePhase: phase ?? execution.sourcePhase ?? null, availablePhases: phases },
    outcome: { available: !unavailableReason, unavailableReason, winner: normalizedRanking[0] || null, ranking: normalizedRanking, consensusMeasure: result?.consensusMeasure ?? standard?.consensusMeasure ?? null, modelSpecificOutput: result?.modelSpecificOutput ?? execution.modelSpecificOutput ?? null, rawOutput: result?.rawOutput ?? execution.rawOutput ?? null },
    visualizations: { hasPerformanceMap: Boolean(normalizedPlots?.isValid), performanceMapData: normalizedPlots?.isValid ? [{ expertPoints: normalizedPlots.expertPoints, collectivePoint: normalizedPlots.collectivePoint }] : null, selectedPhase: phase ?? null, unavailableReason: normalizedPlots?.reason || null },
    interpretation: { available: false },
  };
};

export const buildResultsAnalysisPreview = (data) => ({ ...data, outcome: { ...data.outcome, topRanking: data.outcome.ranking.slice(0, 3) } });
