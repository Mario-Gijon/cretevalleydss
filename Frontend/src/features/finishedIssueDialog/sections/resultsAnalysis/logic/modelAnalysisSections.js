const asArray = (value) => Array.isArray(value) ? value : [];
const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;

const stageAnalysisFor = (execution, stage) => execution?.stageAnalyses?.[stage] ?? (stage === "alternativeEvaluation" ? execution?.alternativeEvaluationAnalysis : null);

export const sectionsForExecution = (execution, stage = "alternativeEvaluation") => {
  const analysis = stageAnalysisFor(execution, stage)?.analysis;
  const sections = asArray(analysis?.sections)
    .filter((section) => text(section?.id) && Array.isArray(section.visualizations))
    .map((section, index) => ({ id: text(section.id), title: text(section.title) || "Model analysis", description: text(section.description), order: Number.isFinite(section.order) ? section.order : index, presentation: section.presentation && typeof section.presentation === "object" ? section.presentation : {}, visualizations: section.visualizations }));
  if (sections.length) return sections.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const visualizations = asArray(analysis?.visualizations);
  return visualizations.length ? [{ id: "legacy-model-analysis", title: "Model analysis", description: null, order: 0, visualizations }] : [];
};

export const buildModelAnalysisSections = (executions, stage = "alternativeEvaluation") => {
  const sections = new Map();
  asArray(executions).forEach((execution, executionOrder) => {
    sectionsForExecution(execution, stage).forEach((section) => {
      const existing = sections.get(section.id) || { ...section, executionOrder, executions: [] };
      existing.executions.push({ execution, visualizations: section.visualizations });
      sections.set(section.id, existing);
    });
  });
  return [...sections.values()]
    .map((section) => ({
      ...section,
      executions: asArray(executions).map((execution) => section.executions.find((entry) => entry.execution.key === execution.key) || { execution, visualizations: [] }),
    }))
    .sort((left, right) => left.order - right.order || left.executionOrder - right.executionOrder || left.id.localeCompare(right.id));
};

export const scopedEntities = (section) => {
  const entities = new Map();
  asArray(section?.executions).flatMap((entry) => asArray(entry.visualizations)).forEach((visualization) => {
    const scope = visualization?.scope;
    if (!text(scope?.dimension) || !text(scope?.id)) return;
    const key = `${scope.dimension}:${scope.id}`;
    if (!entities.has(key)) entities.set(key, { dimension: text(scope.dimension), id: text(scope.id), label: text(scope.label) || text(scope.id), order: Number.isFinite(scope.order) ? scope.order : Number.MAX_SAFE_INTEGER });
  });
  return [...entities.values()].sort((left, right) => left.dimension.localeCompare(right.dimension) || left.order - right.order || left.label.localeCompare(right.label));
};

export const visualizationsForScope = (visualizations, selectedEntity) => asArray(visualizations).filter((visualization) => {
  const scope = visualization?.scope;
  return !selectedEntity || !scope || scope.dimension !== selectedEntity.dimension || scope.id === selectedEntity.id;
});
