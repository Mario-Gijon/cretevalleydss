import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../../../logic/selectFinishedIssueExecution.js";
import { resolveResultPresentation } from "../../../resultPresentations/registry.js";
import { formatFinishedIssuePhaseLabel } from "../../../logic/formatFinishedIssuePhaseLabel.js";
import { buildRankingMovement, buildSpearmanCorrelationMatrix } from "./buildRankingComparison.js";
import { buildResultsVisualizationsData } from "./buildResultsVisualizationsData.js";
import { RESULTS_ANALYSIS_SLOT_COLORS } from "./resultsAnalysisColors.js";
import { selectExecutionGenericAnalysisEntry } from "./selectExecutionGenericAnalysis.js";
import { selectExecutionAlternativeEvaluationAnalysis } from "./selectExecutionAlternativeEvaluationAnalysis.js";
import { selectExecutionStageAnalyses } from "./selectExecutionStageAnalyses.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

const formatScore = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(4)).toString();
};

const nonEmptyString = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const SORTING_ORDER_SEMANTICS = "lower-order-is-less-preferred";

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

const normalizeSorting = ({ payload, output }) => {
  if (output?.categoryOrderSemantics !== SORTING_ORDER_SEMANTICS) return null;
  const alternatives = asArray(payload?.alternatives);
  const alternativesById = new Map(alternatives.map((alternative) => [alternative?.id, alternative]));
  if (alternativesById.size !== alternatives.length || alternatives.some((alternative) => !nonEmptyString(alternative?.id))) return null;

  const categories = asArray(output?.categories).map((category) => ({
    id: nonEmptyString(category?.categoryId),
    label: nonEmptyString(category?.label),
    order: category?.order,
  }));
  if (
    !categories.length ||
    categories.some((category) =>
      !category.id ||
      !category.label ||
      !Number.isInteger(category.order) ||
      category.order < 0
    )
  ) return null;
  const categoryIds = new Set(categories.map((category) => category.id));
  const categoryOrders = new Set(categories.map((category) => category.order));
  if (
    categoryIds.size !== categories.length ||
    categoryOrders.size !== categories.length ||
    categories.some((_, index) => !categoryOrders.has(index))
  ) return null;

  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const assignments = asArray(output?.assignments).map((assignment) => {
    const alternativeId = nonEmptyString(assignment?.alternativeId);
    const category = categoriesById.get(nonEmptyString(assignment?.categoryId));
    const alternative = alternativesById.get(alternativeId);
    if (!alternativeId || !category || !alternative || !nonEmptyString(alternative.name)) return null;
    return { alternativeId, name: alternative.name, categoryId: category.id, categoryLabel: category.label, categoryOrder: category.order };
  });
  const assignedIds = new Set(assignments.filter(Boolean).map((assignment) => assignment.alternativeId));
  if (
    assignments.some((assignment) => !assignment) ||
    assignments.length !== alternativesById.size ||
    assignedIds.size !== assignments.length ||
    alternatives.some((alternative) => !assignedIds.has(alternative.id))
  ) return null;

  return {
    categoryOrderSemantics: SORTING_ORDER_SEMANTICS,
    categories: categories.sort((left, right) => left.order - right.order),
    assignments: assignments.sort(
      (left, right) => left.name.localeCompare(right.name) || left.alternativeId.localeCompare(right.alternativeId),
    ),
  };
};

const sortingPhases = ({ payload, execution, genericAnalysis }) => {
  const factPhases = asArray(genericAnalysis?.facts?.alternativeRelationships?.phases);
  if (factPhases.length) return factPhases;
  const descriptor = asArray(genericAnalysis?.visualizations).find((visualization) => visualization?.type === "alternativeRelationships" && visualization?.mode === "categorical");
  if (Array.isArray(descriptor?.phases)) return descriptor.phases;
  return asArray(execution?.phaseResults)
    .filter((phase) => phase?.resultStructureKey === "sorting" && phase?.resultStructureVersion === 1)
    .map((phase) => {
      const normalized = normalizeSorting({ payload, output: phase.standardizedOutput });
      return normalized ? { phase: phase.phase, ...normalized } : null;
    })
    .filter(Boolean);
};

const normalizeCategoricalFactPhase = (phase) => {
  if (!Number.isInteger(phase?.phase) || phase?.categoryOrderSemantics !== SORTING_ORDER_SEMANTICS) return null;
  const categories = asArray(phase.categories).map((category) => ({
    id: nonEmptyString(category?.categoryId),
    label: nonEmptyString(category?.label),
    order: category?.order,
  }));
  if (
    !categories.length ||
    categories.some((category) => !category.id || !category.label || !Number.isInteger(category.order) || category.order < 0)
  ) return null;
  const categoryIds = new Set(categories.map((category) => category.id));
  const categoryOrders = new Set(categories.map((category) => category.order));
  if (
    categoryIds.size !== categories.length ||
    categoryOrders.size !== categories.length ||
    categories.some((_, index) => !categoryOrders.has(index))
  ) return null;
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const alternatives = asArray(phase.alternatives).map((alternative) => {
    const id = nonEmptyString(alternative?.alternativeId);
    const categoryId = nonEmptyString(alternative?.categoryId);
    const category = categoriesById.get(categoryId);
    const name = nonEmptyString(alternative?.name);
    if (
      !id || !name || !category ||
      alternative?.categoryLabel !== category.label ||
      alternative?.categoryOrder !== category.order
    ) return null;
    return { id, name, categoryId, categoryLabel: category.label, categoryOrder: category.order };
  });
  const alternativeIds = new Set(alternatives.filter(Boolean).map((alternative) => alternative.id));
  if (
    alternatives.some((alternative) => !alternative) ||
    alternativeIds.size !== alternatives.length
  ) return null;
  return {
    phase: phase.phase,
    categoryOrderSemantics: phase.categoryOrderSemantics,
    categories: categories.sort((left, right) => left.order - right.order),
    alternatives,
  };
};

const categorySignature = (phase) => JSON.stringify(
  phase.categories.map(({ id, label, order }) => ({ id, label, order })),
);

const categoricalFactMatchesStoredResult = ({ phase, execution, payload }) => {
  const phaseResult = asArray(execution?.phaseResults).find((candidate) =>
    candidate?.phase === phase.phase &&
    candidate?.resultStructureKey === "sorting" &&
    candidate?.resultStructureVersion === 1,
  );
  const actual = phaseResult
    ? normalizeSorting({ payload, output: phaseResult.standardizedOutput })
    : null;
  if (!actual) return false;
  const actualPhase = {
    categories: actual.categories.map((category) => ({ id: category.id, label: category.label, order: category.order })),
    alternatives: actual.assignments.map((assignment) => ({
      id: assignment.alternativeId,
      categoryId: assignment.categoryId,
    })),
  };
  if (categorySignature(phase) !== categorySignature(actualPhase)) return false;
  const actualById = new Map(actualPhase.alternatives.map((alternative) => [alternative.id, alternative]));
  return phase.alternatives.length === actualById.size && phase.alternatives.every((alternative) =>
    actualById.get(alternative.id)?.categoryId === alternative.categoryId,
  );
};

const normalizeCategoricalTransitions = (genericAnalysis, { execution, payload }) => {
  const relationships = genericAnalysis?.facts?.alternativeRelationships;
  const rawPhases = asArray(relationships?.phases);
  const phases = rawPhases.map(normalizeCategoricalFactPhase);
  if (
    phases.length < 2 ||
    phases.some((phase) => !phase || !categoricalFactMatchesStoredResult({ phase, execution, payload }))
  ) return [];
  phases.sort((left, right) => left.phase - right.phase);
  if (new Set(phases.map((phase) => phase.phase)).size !== phases.length) return [];
  const phaseIndices = new Map(phases.map((phase, index) => [phase.phase, index]));
  const emittedPairs = new Set();
  return asArray(relationships?.transitions).flatMap((transition) => {
    const fromIndex = phaseIndices.get(transition?.fromPhase);
    const toIndex = phaseIndices.get(transition?.toPhase);
    if (
      fromIndex === undefined ||
      toIndex !== fromIndex + 1 ||
      emittedPairs.has(`${transition.fromPhase}:${transition.toPhase}`)
    ) return [];
    const before = phases[fromIndex];
    const after = phases[toIndex];
    if (
      before.categoryOrderSemantics !== after.categoryOrderSemantics ||
      categorySignature(before) !== categorySignature(after)
    ) return [];
    const beforeById = new Map(before.alternatives.map((alternative) => [alternative.id, alternative]));
    const afterById = new Map(after.alternatives.map((alternative) => [alternative.id, alternative]));
    if (
      beforeById.size !== afterById.size ||
      [...beforeById.keys()].some((id) => !afterById.has(id))
    ) return [];
    const expectedChanges = [...beforeById].flatMap(([id, previous]) => {
      const current = afterById.get(id);
      if (previous.categoryId === current.categoryId) return [];
      return [{
        alternativeId: id,
        name: current.name,
        fromCategoryId: previous.categoryId,
        fromCategoryLabel: previous.categoryLabel,
        fromCategoryOrder: previous.categoryOrder,
        toCategoryId: current.categoryId,
        toCategoryLabel: current.categoryLabel,
        toCategoryOrder: current.categoryOrder,
      }];
    }).sort((left, right) => left.alternativeId.localeCompare(right.alternativeId));
    if (!expectedChanges.length) return [];
    const recordedChanges = asArray(transition?.changes);
    if (recordedChanges.length !== expectedChanges.length) return [];
    const recordedById = new Map(recordedChanges.map((change) => [change?.alternativeId, change]));
    if (recordedById.size !== recordedChanges.length) return [];
    const evidenceMatches = expectedChanges.every((expected) => {
      const recorded = recordedById.get(expected.alternativeId);
      return recorded && [
        "fromCategoryId", "fromCategoryLabel", "fromCategoryOrder",
        "toCategoryId", "toCategoryLabel", "toCategoryOrder",
      ].every((key) => recorded[key] === expected[key]);
    });
    if (!evidenceMatches) return [];
    emittedPairs.add(`${transition.fromPhase}:${transition.toPhase}`);
    return [{
      fromPhase: before.phase,
      toPhase: after.phase,
      categories: before.categories,
      changes: expectedChanges,
    }];
  });
};

const getUnavailableReason = (execution, ranking, sorting, resolution) => {
  if (!resolution.presentation?.capabilities.resultsAnalysis) {
    return resolution.unavailableReason || `Results Analysis is not available for ${resolution.resultStructureKey}@${resolution.resultStructureVersion}.`;
  }
  if (resolution.resultStructureKey === "sorting") return sorting ? null : "This execution does not contain a complete standardized sorting assignment.";
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
  const normalizedDashboardResult = analysisSupported && resultPresentation.resultStructureKey === "sorting"
    ? resultPresentation.presentation.normalizeDashboardResult({
      execution,
      alternatives: payload?.alternatives,
      criteria: payload?.criteria,
    })
    : null;
  const ranking = analysisSupported ? normalizeRanking({ payload, execution }) : [];
  const sorting = analysisSupported && resultPresentation.resultStructureKey === "sorting"
    ? normalizeSorting({ payload, output: execution?.standardizedOutput })
    : null;
  const genericAnalysisEntry = analysisSupported
    ? selectExecutionGenericAnalysisEntry(payload, option.key)
    : null;
  const genericAnalysis = genericAnalysisEntry?.genericAnalysis ?? null;
  const categoricalPhases = resultPresentation.resultStructureKey === "sorting"
    ? sortingPhases({ payload, execution, genericAnalysis })
    : [];
  const categoricalTransitions = resultPresentation.resultStructureKey === "sorting"
    ? normalizeCategoricalTransitions(genericAnalysis, { execution, payload })
    : [];
  const unavailableReason = getUnavailableReason(execution, ranking, sorting, resultPresentation);
  const name = option.label || execution?.label || "—";
  const modelName = option.modelName || execution?.model?.name || "—";
  const type = execution?.type || option.type;
  const shortLabel = type === "base" ? baseLabel(modelName) : name;
  const fullLabel = type === "base" ? shortLabel : `${name} · ${modelName}`;
  const stageAnalyses = selectExecutionStageAnalyses(payload, option.key);
  const selectedPhaseResult = execution?.phaseResults?.find(
    (phaseResult) => phaseResult?.phase === execution?.sourcePhase,
  );
  const modelApiKey = execution?.model?.technical?.apiModelKey
    || execution?.model?.apiModelKey
    || execution?.modelSpecificOutput?.apiModelKey
    || null;
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
    sorting,
    ahpSortIAnalysisEvidence: normalizedDashboardResult?.ahpSortI
      ? {
        categories: normalizedDashboardResult.categories,
        evidence: normalizedDashboardResult.ahpSortI,
      }
      : null,
    categoricalPhases,
    categoricalTransitions,
    resultStructureKey: resultPresentation.resultStructureKey,
    resultStructureVersion: resultPresentation.resultStructureVersion,
    analysisSupported,
    available: analysisSupported && !unavailableReason,
    unavailableReason,
    sourcePhase: execution?.sourcePhase ?? null,
    modelApiKey,
    genericAnalysisExecutionKey: genericAnalysisEntry?.executionKey ?? null,
    genericAnalysisGeneratedAt: genericAnalysisEntry?.generatedAt ?? null,
    sourceExecutionCompletedAt: execution?.type === "scenario"
      ? selectedPhaseResult?.execution?.completedAt ?? null
      : selectedPhaseResult?.computedAt ?? null,
    phaseLabel: formatFinishedIssuePhaseLabel({ phase: execution?.sourcePhase, orderedPhases: execution?.phaseResults?.map((result) => result.phase) }),
    // Keep the controlled stored result and its execution-keyed Generic
    // Analysis together. TOPSIS-Sort projection selection also checks source
    // phase and timestamps before preferring reconstructed evidence.
    standardizedOutput: analysisSupported ? execution?.standardizedOutput ?? null : null,
    consensusMeasure: execution?.consensusMeasure ?? null,
    modelSpecificOutput: execution?.modelSpecificOutput ?? null,
    rawOutput: execution?.rawOutput ?? null,
    genericAnalysis,
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
  const excludedSelections = requested.filter((execution) => !execution.available);
  const selected = visibleExecutionLabels(requested.filter((execution) => execution.available));
  const mode = selected.length > 1 ? "comparison" : selected.length === 1 ? "single" : "unavailable";
  const primary = selected[0] || null;
  const rankingOnlySelection = selected.length > 0 && selected.every((execution) => execution.resultStructureKey === "ranking");
  const categoricalComparisons = [];
  const categoricalUnavailableComparisons = [];
  const sortingExecutions = selected.filter((execution) => execution.resultStructureKey === "sorting");
  for (let leftIndex = 0; leftIndex < sortingExecutions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sortingExecutions.length; rightIndex += 1) {
      const left = sortingExecutions[leftIndex];
      const right = sortingExecutions[rightIndex];
      const categorySignature = (sorting) => JSON.stringify({
        semantics: sorting?.categoryOrderSemantics,
        categories: sorting?.categories?.map(({ id, label, order }) => ({ id, label, order })),
      });
      const sameCategories = categorySignature(left.sorting) === categorySignature(right.sorting);
      const leftIds = left.sorting?.assignments?.map((assignment) => assignment.alternativeId).sort() || [];
      const rightIds = right.sorting?.assignments?.map((assignment) => assignment.alternativeId).sort() || [];
      if (!sameCategories) {
        categoricalUnavailableComparisons.push({ leftKey: left.key, rightKey: right.key, reason: "category_configuration_changed" });
      } else if (JSON.stringify(leftIds) !== JSON.stringify(rightIds)) {
        categoricalUnavailableComparisons.push({ leftKey: left.key, rightKey: right.key, reason: "alternative_set_changed" });
      } else {
        const rightById = new Map(right.sorting.assignments.map((assignment) => [assignment.alternativeId, assignment]));
        const changes = left.sorting.assignments.filter((assignment) => assignment.categoryId !== rightById.get(assignment.alternativeId)?.categoryId).map((assignment) => ({
          alternativeId: assignment.alternativeId,
          name: assignment.name,
          fromCategoryId: assignment.categoryId,
          fromCategoryLabel: assignment.categoryLabel,
          fromCategoryOrder: assignment.categoryOrder,
          toCategoryId: rightById.get(assignment.alternativeId)?.categoryId,
          toCategoryLabel: rightById.get(assignment.alternativeId)?.categoryLabel,
          toCategoryOrder: rightById.get(assignment.alternativeId)?.categoryOrder,
        }));
        if (!changes.length) continue;
        categoricalComparisons.push({
          leftKey: left.key,
          rightKey: right.key,
          leftPhase: left.sourcePhase,
          rightPhase: right.sourcePhase,
          changes,
        });
      }
    }
  }
  const visualizations = selected.length ? buildResultsVisualizationsData({ payload, executions: selected }) : null;
  const analysisUnavailableReason = selected.length
    ? null
    : excludedSelections[0]?.unavailableReason || selectableOptions.find((option) => !option.selectable)?.unavailableReason || "No analysis-capable execution is available for Results Analysis.";

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
    categoricalComparisons,
    categoricalUnavailableComparisons,
    selection: {
      count: selected.length,
      min: selectableOptions.some((option) => option.selectable) ? 1 : 0,
      max: 3,
      canAddMore: selected.length < 3 && selectableOptions.some((option) => option.selectable && !selected.some((entry) => entry.key === option.key)),
      label: selected.length === 0 ? "No analysis-capable execution selected" : selected.length === 1 ? "Viewing 1 execution" : `Viewing ${selected.length} executions`,
    },
    single: mode === "single" ? { available: Boolean(primary?.available), unavailableReason: primary?.unavailableReason || null, ranking: primary?.ranking || [] } : null,
    comparison: mode === "comparison" && rankingOnlySelection ? {
      rankings: selected,
      movement: buildRankingMovement(selected),
      correlations: buildSpearmanCorrelationMatrix(selected),
    } : null,
  };
};

export { RESULTS_ANALYSIS_SLOT_COLORS };
