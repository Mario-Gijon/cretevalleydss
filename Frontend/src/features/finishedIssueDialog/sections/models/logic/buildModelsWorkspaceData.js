const asArray = (value) => (Array.isArray(value) ? value : []);

const nonEmpty = (value, fallback = "—") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const descriptionFor = (model) =>
  nonEmpty(model?.description?.short, null) ||
  nonEmpty(model?.description?.extended, null);

const phasesFor = (payload) =>
  [...new Set(
    asArray(payload?.phaseResults)
      .filter((result) => result?.stage === "alternativeEvaluation" && Number.isInteger(result?.phase))
      .map((result) => result.phase)
  )].sort((left, right) => left - right);

const executionFor = (option, selectedKey, payload) => {
  const scenario = option.type === "scenario"
    ? asArray(payload?.scenarios).find((entry) => entry?.id === option.key) || null
    : null;

  return {
    ...option,
    label: nonEmpty(option.label, option.type === "base" ? "Base" : "Scenario"),
    modelName: nonEmpty(option.modelName),
    selected: option.key === selectedKey,
    removable: option.type === "scenario",
    scenario,
  };
};

export const buildModelsWorkspaceData = ({ payload, selectedExecution, executionOptions }) => {
  const options = asArray(executionOptions);
  const selectedKey = selectedExecution?.key || "base";
  const selected = selectedExecution || null;
  const model = selected?.model || payload?.models?.base || null;
  const configuredParameters =
    selected?.configuration?.configuredParameters ??
    selected?.configuration?.modelParameters ??
    model?.configuredParameters ??
    {};
  const effectiveParameters =
    selected?.configuration?.normalizedParameters ??
    selected?.configuration?.normalizedModelParameters ??
    model?.effectiveParameters ??
    configuredParameters;

  return {
    consensusEnabled: payload?.consensus?.enabled === true,
    availableSourcePhases: phasesFor(payload),
    executions: options.map((option) => executionFor(option, selectedKey, payload)),
    availableModels: asArray(payload?.models?.compatible),
    selectedExecution: {
      key: selectedKey,
      type: selected?.type || "base",
      label: nonEmpty(selected?.label, "Base"),
      model,
      modelDescription: descriptionFor(model),
      status: selected?.scenario?.status || "completed",
      error: selected?.scenario?.error ?? null,
      sourcePhase: selected?.sourcePhase ?? null,
      createdAt: selected?.scenario?.createdAt || selected?.scenario?.updatedAt || null,
      resultId: selected?.scenario?.id || null,
      parameterDefinitions: asArray(model?.parameterDefinitions),
      configuredParameters,
      effectiveParameters,
      rawOutput: selected?.rawOutput ?? null,
    },
  };
};

export default buildModelsWorkspaceData;
