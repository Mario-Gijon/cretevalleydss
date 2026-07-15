const asArray = (value) => (Array.isArray(value) ? value : []);

const nonEmpty = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const selectAlternativePhaseResults = (payload) =>
  asArray(payload?.phaseResults)
    .filter(
      (result) =>
        result?.stage === "alternativeEvaluation" &&
        Number.isInteger(result?.phase) &&
        result.phase >= 0
    )
    .slice()
    .sort((left, right) => left.phase - right.phase);

export const selectFinishedIssueExecution = (payload, selectedExecutionKey = "base") => {
  const basePhaseResults = selectAlternativePhaseResults(payload);
  const basePhase = basePhaseResults.at(-1) || null;
  const scenarios = asArray(payload?.scenarios);
  const scenario = scenarios.find((entry) => entry?.id === selectedExecutionKey) || null;

  if (selectedExecutionKey === "base" || !scenario) {
    return {
      key: "base",
      type: "base",
      label: "Base",
      model: payload?.models?.base || null,
      configuration: payload?.configuration || null,
      sourcePhase: basePhase?.phase ?? null,
      phaseResults: basePhaseResults,
      standardizedOutput: basePhase?.standardizedOutput ?? null,
      modelSpecificOutput: basePhase?.modelSpecificOutput ?? null,
      rawOutput: basePhase?.rawOutput ?? null,
      scenario: null,
    };
  }

  return {
    key: scenario.id,
    type: "scenario",
    label: nonEmpty(scenario.name) || scenario?.targetModel?.name || "Scenario",
    model: scenario.targetModel || null,
    configuration: scenario.configuration || null,
    sourcePhase: Number.isInteger(scenario?.inputs?.consensusPhaseUsed)
      ? scenario.inputs.consensusPhaseUsed
      : null,
    phaseResults: [],
    standardizedOutput: scenario?.outputs?.standardResult ?? null,
    modelSpecificOutput: scenario?.outputs?.modelExecution ?? null,
    rawOutput: scenario?.outputs?.rawOutput ?? null,
    scenario,
  };
};

export const buildFinishedIssueExecutionOptions = (payload) => [
  {
    key: "base",
    type: "base",
    label: "Base",
    modelName: payload?.models?.base?.name || "—",
    status: "completed",
    error: null,
  },
  ...asArray(payload?.scenarios).map((scenario) => ({
    key: scenario?.id,
    type: "scenario",
    label: nonEmpty(scenario?.name) || scenario?.targetModel?.name || "Scenario",
    modelName: scenario?.targetModel?.name || "—",
    status: scenario?.status || "unknown",
    error: scenario?.error ?? null,
  })).filter((option) => Boolean(option.key)),
];

export default selectFinishedIssueExecution;
