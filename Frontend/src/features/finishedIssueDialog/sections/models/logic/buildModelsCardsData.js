export const DEFAULT_MODEL_PAPER_URL = "https://example.com";

const asArray = (value) => (Array.isArray(value) ? value : []);

const nonEmpty = (value, fallback = null) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const getScenarioModel = (payload, scenario) => {
  const catalogModel = asArray(payload?.models?.compatible).find(
    (model) => model?.id === scenario?.targetModel?.id
  );

  return catalogModel
    ? { ...catalogModel, ...scenario?.targetModel }
    : scenario?.targetModel || null;
};

const resolvePaperUrl = (model) => nonEmpty(model?.paperUrl, DEFAULT_MODEL_PAPER_URL);

const resolveBaseComputedAt = (payload) => {
  const result = asArray(payload?.phaseResults)
    .filter(
      (entry) =>
        entry?.stage === "alternativeEvaluation" &&
        Number.isInteger(entry?.phase)
    )
    .sort((left, right) => left.phase - right.phase)
    .at(-1);

  return (
    result?.computedAt ??
    result?.modelSpecificOutput?.executedAt ??
    result?.createdAt ??
    null
  );
};

export const buildModelsCardsData = ({ payload, selectedExecution, executionOptions }) => {
  const scenariosById = new Map(
    asArray(payload?.scenarios)
      .filter((scenario) => scenario?.id)
      .map((scenario) => [scenario.id, scenario])
  );
  const selectedKey = selectedExecution?.key || "base";
  const executions = asArray(executionOptions).map((option) => {
    const scenario = option.type === "scenario" ? scenariosById.get(option.key) : null;
    const model = option.type === "base"
      ? payload?.models?.base || null
      : getScenarioModel(payload, scenario);

    return {
      key: option.key,
      type: option.type,
      selected: option.key === selectedKey,
      removable: option.type === "scenario",
      name: option.type === "base"
        ? "Base"
        : nonEmpty(scenario?.name, option.label || "Scenario"),
      modelName: nonEmpty(model?.name, option.modelName || "—"),
      description: option.type === "base"
        ? "Original issue execution."
        : nonEmpty(scenario?.description, "No description added."),
      computedAt: option.type === "base"
        ? resolveBaseComputedAt(payload)
        : scenario?.execution?.completedAt ?? scenario?.createdAt ??
          null,
      paperUrl: resolvePaperUrl(model),
    };
  });
  const selectedModel = selectedExecution?.type === "scenario"
    ? getScenarioModel(payload, selectedExecution.scenario)
    : payload?.models?.base || selectedExecution?.model || null;
  const selectedName = selectedExecution?.type === "scenario"
    ? nonEmpty(selectedExecution?.scenario?.name, selectedExecution?.label || "Scenario")
    : "Base";
  const values = selectedExecution?.type === "scenario"
    ? selectedExecution?.requestSnapshot?.modelParameters ?? {}
    : selectedModel?.effectiveParameters ?? selectedModel?.configuredParameters ?? {};

  return {
    consensusEnabled: payload?.consensus?.enabled === true,
    executions,
    scenarioCount: executions.filter((execution) => execution.type === "scenario").length,
    selectedExecution: {
      key: selectedKey,
      type: selectedExecution?.type || "base",
      name: selectedName,
      model: selectedModel,
      modelName: nonEmpty(selectedModel?.name, "—"),
      parameterDefinitions: asArray(selectedModel?.parameterDefinitions),
      values,
      rawOutput: selectedExecution?.rawOutput ?? null,
    },
  };
};

export default buildModelsCardsData;
