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

export const selectFinishedIssueExecution = (payload, selectedExecutionKey = "base", selectedPhase = null) => {
  const basePhaseResults = selectAlternativePhaseResults(payload);
  const basePhase = basePhaseResults.find((result) => result.phase === selectedPhase) || basePhaseResults.at(-1) || null;
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
      consensusMeasure: basePhase?.consensusMeasure ?? null,
      modelSpecificOutput: basePhase?.modelSpecificOutput ?? null,
      rawOutput: basePhase?.rawOutput ?? null,
      modelParameters:
        payload?.models?.base?.effectiveParameters ??
        payload?.models?.base?.configuredParameters ??
        {},
      scenario: null,
    };
  }

  const catalogModel = asArray(payload?.models?.compatible).find(
    (model) => model?.id === scenario.targetModel?.id
  );

  return {
    key: scenario.id,
    type: "scenario",
    label: nonEmpty(scenario.name) || scenario?.targetModel?.name || "Scenario",
    model: catalogModel
      ? { ...catalogModel, ...scenario.targetModel }
      : scenario.targetModel || null,
    requestSnapshot: scenario.requestSnapshot || null,
    sourcePhase: Number.isInteger(scenario?.source?.consensusPhase)
      ? scenario.source.consensusPhase
      : null,
    phaseResults: [],
    standardizedOutput: scenario?.result?.standardResult ?? null,
    consensusMeasure: scenario?.result?.standardResult?.consensusMeasure ?? null,
    modelSpecificOutput: scenario?.result?.modelExecution ?? null,
    rawOutput: scenario?.result?.rawOutput ?? null,
    modelParameters: scenario?.requestSnapshot?.modelParameters ?? {},
    scenario,
  };
};

export const buildFinishedIssueExecutionOptions = (payload) => [
  {
    key: "base",
    type: "base",
    label: "Base",
    modelName: payload?.models?.base?.name || "—",
  },
  ...asArray(payload?.scenarios).map((scenario) => ({
    key: scenario?.id,
    type: "scenario",
    label: nonEmpty(scenario?.name) || scenario?.targetModel?.name || "Scenario",
    modelName: scenario?.targetModel?.name || "—",
  })).filter((option) => Boolean(option.key)),
];

export default selectFinishedIssueExecution;
