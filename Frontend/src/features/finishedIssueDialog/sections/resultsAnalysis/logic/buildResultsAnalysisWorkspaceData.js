import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../../../logic/selectFinishedIssueExecution.js";
import { resolveResultPresentation } from "../../../resultPresentations/registry.js";
import { formatFinishedIssuePhaseLabel } from "../../../logic/formatFinishedIssuePhaseLabel.js";
import { buildRankingMovement, buildSpearmanCorrelationMatrix } from "./buildRankingComparison.js";
import { buildResultsVisualizationsData } from "./buildResultsVisualizationsData.js";
import { RESULTS_ANALYSIS_SLOT_COLORS } from "./resultsAnalysisColors.js";
import { selectExecutionGenericAnalysis } from "./selectExecutionGenericAnalysis.js";
import { selectExecutionAlternativeEvaluationAnalysis } from "./selectExecutionAlternativeEvaluationAnalysis.js";
import { selectExecutionStageAnalyses } from "./selectExecutionStageAnalyses.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

const formatScore = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(4)).toString();
};

const nonEmptyString = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const resolveClassificationLabel = ({ classificationId, modelParameters }) => {
  if (!classificationId || !modelParameters || typeof modelParameters !== "object") {
    return null;
  }

  const profile = asArray(modelParameters.profiles).find((candidate) => {
    return nonEmptyString(candidate?.id) === classificationId;
  });

  return nonEmptyString(profile?.label);
};

const resolveExecution = (payload, key, selectedPhase) => selectFinishedIssueExecution(payload, key, selectedPhase);

const normalizeRanking = ({ payload, execution }) => {
  const alternatives = new Map(asArray(payload?.alternatives).map((alternative) => [alternative?.id, alternative]));
  return asArray(execution?.standardizedOutput?.rankedAlternatives)
    .map((entry, index) => {
      const alternative = alternatives.get(entry?.alternativeId);
      const classificationId = nonEmptyString(entry?.classification);
      const resultLabel = nonEmptyString(entry?.resultLabel);
      return {
        id: entry?.alternativeId || `ranking-${index}`,
        name: alternative?.name || entry?.name || "—",
        description: alternative?.description || "",
        position: Number.isInteger(entry?.rank) ? entry.rank : index + 1,
        score: typeof entry?.score === "number" && Number.isFinite(entry.score) ? entry.score : null,
        formattedScore: formatScore(entry?.score),
        classificationId,
        classificationLabel: resolveClassificationLabel({
          classificationId,
          modelParameters: execution?.modelParameters,
        }),
        resultLabel,
      };
    })
    .sort((left, right) => left.position - right.position);
};

const getUnavailableReason = (execution, ranking, resolution) => {
  if (!resolution.presentation?.capabilities.resultsAnalysis) {
    return resolution.unavailableReason || `Results Analysis is not available for ${resolution.resultStructureKey}@${resolution.resultStructureVersion}.`;
  }
  return ranking.length ? null : "This execution does not contain a standardized ranking.";
};

const baseLabel = () => "Base";

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

const buildExecution = ({ payload, option, selectedPhase = null, slotIndex = 0 }) => {
  const execution = resolveExecution(payload, option.key, selectedPhase);
  const resultPresentation = resolveResultPresentation(execution || {});
  const analysisSupported = Boolean(resultPresentation.presentation?.capabilities.resultsAnalysis);
  const ranking = analysisSupported ? normalizeRanking({ payload, execution }) : [];
  const unavailableReason = getUnavailableReason(execution, ranking, resultPresentation);
  const name = option.label || execution?.label || "—";
  const modelName = option.modelName || execution?.model?.name || "—";
  const type = execution?.type || option.type;
  const shortLabel = type === "base" ? baseLabel(modelName) : name;
  const fullLabel = type === "base" ? shortLabel : `${name} · ${modelName}`;
  const stageAnalyses = selectExecutionStageAnalyses(payload, option.key);
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
    resultStructureKey: resultPresentation.resultStructureKey,
    resultStructureVersion: resultPresentation.resultStructureVersion,
    analysisSupported,
    available: analysisSupported && !unavailableReason,
    unavailableReason,
    sourcePhase: execution?.sourcePhase ?? null,
    phaseLabel: formatFinishedIssuePhaseLabel({ phase: execution?.sourcePhase, orderedPhases: execution?.phaseResults?.map((result) => result.phase) }),
    // Keep the controlled stored result and its persisted Generic Analysis
    // together. The visualization builder may use Generic Analysis only when
    // the stored standardized projection is absent.
    standardizedOutput: analysisSupported ? execution?.standardizedOutput ?? null : null,
    consensusMeasure: execution?.consensusMeasure ?? null,
    modelSpecificOutput: execution?.modelSpecificOutput ?? null,
    rawOutput: execution?.rawOutput ?? null,
    genericAnalysis: analysisSupported ? selectExecutionGenericAnalysis(payload, option.key) : null,
    stageAnalyses: analysisSupported ? stageAnalyses : {},
    // Retained as a compatibility alias while consumers migrate to the generic
    // stageAnalyses workspace contract.
    alternativeEvaluationAnalysis: analysisSupported
      ? stageAnalyses.alternativeEvaluation ?? selectExecutionAlternativeEvaluationAnalysis(payload, option.key)
      : null,
  };
};

export const buildResultsAnalysisSelectableOptions = (payload, selectedPhase = null) => buildFinishedIssueExecutionOptions(payload).map((option) => {
  const execution = buildExecution({ payload, option, selectedPhase });
  return {
    ...option,
    displayLabel: execution.displayLabel,
    selectable: execution.available,
    unavailableReason: execution.unavailableReason,
  };
});

export const buildResultsAnalysisWorkspaceData = ({ payload, selectedExecutionKeys, selectedPhase = null }) => {
  const selectableOptions = buildResultsAnalysisSelectableOptions(payload, selectedPhase);
  const optionsByKey = new Map(selectableOptions.map((option) => [option.key, option]));
  const requested = asArray(selectedExecutionKeys)
    .slice(0, 3)
    .map((key, slotIndex) => {
      const option = optionsByKey.get(key);
      return option ? buildExecution({ payload, option, selectedPhase, slotIndex }) : null;
    })
    .filter(Boolean);
  const excludedSelections = requested.filter((execution) => !execution.analysisSupported);
  const selected = visibleExecutionLabels(requested.filter((execution) => execution.analysisSupported));
  const mode = selected.length > 1 ? "comparison" : selected.length === 1 ? "single" : "unavailable";
  const primary = selected[0] || null;
  const visualizations = selected.length ? buildResultsVisualizationsData({ payload, executions: selected }) : null;
  const analysisUnavailableReason = selected.length
    ? null
    : excludedSelections[0]?.unavailableReason || selectableOptions.find((option) => !option.selectable)?.unavailableReason || "No ranking-capable execution is available for Results Analysis.";

  return {
    mode,
    selected,
    primary,
    visualizations,
    analysisAvailable: selected.length > 0,
    analysisUnavailableReason,
    excludedSelections,
    // Interpretation remains a neutral panel for now, but receives this same
    // workspace contract rather than retaining a separate primary selection.
    interpretation: { mode, selected, primary },
    selectableOptions,
    selection: {
      count: selected.length,
      min: selectableOptions.some((option) => option.selectable) ? 1 : 0,
      max: 3,
      canAddMore: selected.length < 3 && selectableOptions.some((option) => option.selectable && !selected.some((entry) => entry.key === option.key)),
      label: selected.length === 0 ? "No ranking-capable execution selected" : selected.length === 1 ? "Viewing 1 execution" : `Comparing ${selected.length} executions`,
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
