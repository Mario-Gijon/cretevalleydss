import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../../../logic/selectFinishedIssueExecution.js";
import { normalizePlotsGraphic } from "../../../shared/logic/buildFinishedIssueGraphs.js";
import { buildRankingMovement, buildSpearmanCorrelationMatrix } from "./buildRankingComparison.js";

const SLOT_COLORS = ["#6fdc68", "#27d5e4", "#a960e8"];
const asArray = (value) => (Array.isArray(value) ? value : []);

const formatScore = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(4)).toString();
};

const resolveFinalBaseExecution = (payload) => {
  const execution = selectFinishedIssueExecution(payload, "base");
  const finalPhase = asArray(execution.phaseResults).at(-1) || null;
  return {
    ...execution,
    sourcePhase: finalPhase?.phase ?? execution.sourcePhase ?? null,
    standardizedOutput: finalPhase?.standardizedOutput ?? execution.standardizedOutput ?? null,
    modelSpecificOutput: finalPhase?.modelSpecificOutput ?? execution.modelSpecificOutput ?? null,
    rawOutput: finalPhase?.rawOutput ?? execution.rawOutput ?? null,
  };
};

const resolveExecution = (payload, key) => key === "base" ? resolveFinalBaseExecution(payload) : selectFinishedIssueExecution(payload, key);

const normalizeRanking = ({ payload, execution }) => {
  const alternatives = new Map(asArray(payload?.alternatives).map((alternative) => [alternative?.id, alternative]));
  return asArray(execution?.standardizedOutput?.rankedAlternatives)
    .map((entry, index) => {
      const alternative = alternatives.get(entry?.alternativeId);
      return {
        id: entry?.alternativeId || `ranking-${index}`,
        name: alternative?.name || entry?.name || "—",
        description: alternative?.description || "",
        position: Number.isInteger(entry?.rank) ? entry.rank : index + 1,
        score: typeof entry?.score === "number" && Number.isFinite(entry.score) ? entry.score : null,
        formattedScore: formatScore(entry?.score),
      };
    })
    .sort((left, right) => left.position - right.position);
};

const getUnavailableReason = (execution, ranking) => {
  if (execution?.type === "scenario" && execution?.scenario?.status === "error") {
    return execution.scenario.error || "Scenario execution failed.";
  }
  return ranking.length ? null : "This execution does not contain a standardized ranking.";
};

const buildExecution = ({ payload, option, slotIndex = 0 }) => {
  const execution = resolveExecution(payload, option.key);
  const ranking = normalizeRanking({ payload, execution });
  const unavailableReason = getUnavailableReason(execution, ranking);
  const normalizedPlots = normalizePlotsGraphic(execution?.standardizedOutput?.plotsGraphic);

  return {
    key: option.key,
    type: execution?.type || option.type,
    name: option.label || execution?.label || "—",
    modelName: option.modelName || execution?.model?.name || "—",
    displayLabel: `${option.label || execution?.label || "—"} · ${option.modelName || execution?.model?.name || "—"}`,
    color: SLOT_COLORS[slotIndex],
    ranking,
    available: !unavailableReason,
    unavailableReason,
    sourcePhase: execution?.sourcePhase ?? null,
    visualizations: {
      hasPerformanceMap: Boolean(normalizedPlots?.isValid),
      performanceMapData: normalizedPlots?.isValid ? [{ expertPoints: normalizedPlots.expertPoints, collectivePoint: normalizedPlots.collectivePoint }] : null,
      selectedPhase: execution?.sourcePhase ?? null,
      unavailableReason: normalizedPlots?.reason || null,
    },
  };
};

export const buildResultsAnalysisSelectableOptions = (payload) => buildFinishedIssueExecutionOptions(payload).map((option) => {
  const execution = buildExecution({ payload, option });
  return {
    ...option,
    displayLabel: execution.displayLabel,
    selectable: execution.available,
    unavailableReason: execution.unavailableReason,
  };
});

export const buildResultsAnalysisWorkspaceData = ({ payload, selectedExecutionKeys }) => {
  const selectableOptions = buildResultsAnalysisSelectableOptions(payload);
  const optionsByKey = new Map(selectableOptions.map((option) => [option.key, option]));
  const selected = asArray(selectedExecutionKeys)
    .slice(0, 3)
    .map((key, slotIndex) => {
      const option = optionsByKey.get(key);
      return option ? buildExecution({ payload, option, slotIndex }) : null;
    })
    .filter(Boolean);
  const mode = selected.length > 1 ? "comparison" : "single";
  const primary = selected[0] || null;

  return {
    mode,
    selected,
    primary,
    selectableOptions,
    selection: {
      count: selected.length,
      min: 1,
      max: 3,
      canAddMore: selected.length < 3,
      label: selected.length === 1 ? "Viewing 1 execution" : `Comparing ${selected.length} executions`,
    },
    single: mode === "single" ? { available: Boolean(primary?.available), unavailableReason: primary?.unavailableReason || null, ranking: primary?.ranking || [] } : null,
    comparison: mode === "comparison" ? {
      rankings: selected,
      movement: buildRankingMovement(selected),
      correlations: buildSpearmanCorrelationMatrix(selected),
    } : null,
  };
};

export const RESULTS_ANALYSIS_SLOT_COLORS = SLOT_COLORS;
