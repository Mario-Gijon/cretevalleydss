import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../../../logic/selectFinishedIssueExecution.js";
import { buildRankingMovement, buildSpearmanCorrelationMatrix } from "./buildRankingComparison.js";
import { buildResultsVisualizationsData } from "./buildResultsVisualizationsData.js";
import { RESULTS_ANALYSIS_SLOT_COLORS } from "./resultsAnalysisColors.js";

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

const baseLabel = (modelName) => `Base · ${modelName || "—"}`;

const visibleExecutionLabels = (executions) => {
  const candidateCounts = executions.reduce((counts, execution) => {
    const candidate = execution.shortLabel;
    counts.set(candidate, (counts.get(candidate) || 0) + 1);
    return counts;
  }, new Map());
  return executions.map((execution) => {
    const collision = candidateCounts.get(execution.shortLabel) > 1;
    const visibleLabel = collision && execution.type === "scenario"
      ? execution.fullLabel === execution.shortLabel ? `${execution.fullLabel} (scenario)` : execution.fullLabel
      : execution.shortLabel;
    return { ...execution, displayLabel: visibleLabel };
  });
};

const buildExecution = ({ payload, option, slotIndex = 0 }) => {
  const execution = resolveExecution(payload, option.key);
  const ranking = normalizeRanking({ payload, execution });
  const unavailableReason = getUnavailableReason(execution, ranking);
  const name = option.label || execution?.label || "—";
  const modelName = option.modelName || execution?.model?.name || "—";
  const type = execution?.type || option.type;
  const shortLabel = type === "base" ? baseLabel(modelName) : name;
  const fullLabel = type === "base" ? shortLabel : `${name} · ${modelName}`;
  return {
    key: option.key,
    type,
    name,
    modelName,
    shortLabel,
    fullLabel,
    displayLabel: shortLabel,
    color: RESULTS_ANALYSIS_SLOT_COLORS[slotIndex],
    ranking,
    available: !unavailableReason,
    unavailableReason,
    sourcePhase: execution?.sourcePhase ?? null,
    // Keep the controlled source on this local execution shape. The
    // visualization builder reads only standardizedOutput.plotsGraphic.
    standardizedOutput: execution?.standardizedOutput ?? null,
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
  const selected = visibleExecutionLabels(asArray(selectedExecutionKeys)
    .slice(0, 3)
    .map((key, slotIndex) => {
      const option = optionsByKey.get(key);
      return option ? buildExecution({ payload, option, slotIndex }) : null;
    })
    .filter(Boolean));
  const mode = selected.length > 1 ? "comparison" : "single";
  const primary = selected[0] || null;
  const visualizations = buildResultsVisualizationsData({ payload, executions: selected });

  return {
    mode,
    selected,
    primary,
    visualizations,
    // Interpretation remains a neutral panel for now, but receives this same
    // workspace contract rather than retaining a separate primary selection.
    interpretation: { mode, selected, primary },
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

export { RESULTS_ANALYSIS_SLOT_COLORS };
