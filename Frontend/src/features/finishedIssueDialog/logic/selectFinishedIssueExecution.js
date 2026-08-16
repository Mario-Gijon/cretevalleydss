const asArray = (value) => (Array.isArray(value) ? value : []);
const nonEmpty = (value) => typeof value === "string" && value.trim() ? value.trim() : null;

export const selectAlternativePhaseResults = (payload) => asArray(payload?.phaseResults)
  .filter((result) => result?.stage === "alternativeEvaluation" && Number.isInteger(result?.phase) && result.phase >= 0)
  .slice().sort((left, right) => left.phase - right.phase);

const selectScenarioPhaseResults = (scenario) => {
  const phaseResults = asArray(scenario?.phaseResults)
    .filter((result) => Number.isInteger(result?.phase) && result.phase >= 0)
    .slice().sort((left, right) => left.phase - right.phase);
  if (phaseResults.length) return phaseResults;

  // Legacy finished-issue payloads had one root-level scenario execution.
  return [{
    phase: Number.isInteger(scenario?.source?.consensusPhase) ? scenario.source.consensusPhase : 0,
    requestSnapshot: scenario?.requestSnapshot ?? {},
    standardizedOutput: scenario?.result?.standardResult ?? {},
    consensusMeasure: scenario?.result?.standardResult?.consensusMeasure ?? null,
    modelSpecificOutput: scenario?.result?.modelExecution ?? {},
    rawOutput: scenario?.result?.rawOutput ?? {},
    execution: scenario?.execution ?? {},
  }];
};

const selectPhase = (phaseResults, selectedPhase) =>
  phaseResults.find((result) => result.phase === selectedPhase) || phaseResults.at(-1) || null;

export const selectFinishedIssueExecution = (payload, selectedExecutionKey = "base", selectedPhase = null) => {
  const basePhaseResults = selectAlternativePhaseResults(payload);
  const basePhase = selectPhase(basePhaseResults, selectedPhase);
  const scenarios = asArray(payload?.scenarios);
  const scenario = scenarios.find((entry) => entry?.id === selectedExecutionKey) || null;

  if (selectedExecutionKey === "base" || !scenario) {
    return {
      key: "base", type: "base", label: "Base", model: payload?.models?.base || null,
      configuration: payload?.configuration || null, sourcePhase: basePhase?.phase ?? null,
      phaseResults: basePhaseResults, standardizedOutput: basePhase?.standardizedOutput ?? null,
      consensusMeasure: basePhase?.consensusMeasure ?? null,
      modelSpecificOutput: basePhase?.modelSpecificOutput ?? null, rawOutput: basePhase?.rawOutput ?? null,
      modelParameters: payload?.models?.base?.effectiveParameters ?? payload?.models?.base?.configuredParameters ?? {},
      scenario: null,
    };
  }

  const catalogModel = asArray(payload?.models?.compatible).find((model) => model?.id === scenario.targetModel?.id);
  const phaseResults = selectScenarioPhaseResults(scenario);
  const phaseResult = selectPhase(phaseResults, selectedPhase);
  return {
    key: scenario.id, type: "scenario", label: nonEmpty(scenario.name) || scenario?.targetModel?.name || "Scenario",
    model: catalogModel ? { ...catalogModel, ...scenario.targetModel } : scenario.targetModel || null,
    requestSnapshot: phaseResult?.requestSnapshot ?? null, sourcePhase: phaseResult?.phase ?? null,
    phaseResults, standardizedOutput: phaseResult?.standardizedOutput ?? null,
    consensusMeasure: phaseResult?.consensusMeasure ?? null,
    modelSpecificOutput: phaseResult?.modelSpecificOutput ?? null, rawOutput: phaseResult?.rawOutput ?? null,
    modelParameters: phaseResult?.requestSnapshot?.modelParameters ?? {}, scenario,
  };
};

export const buildFinishedIssueExecutionOptions = (payload) => [
  { key: "base", type: "base", label: "Base", modelName: payload?.models?.base?.name || "—" },
  ...asArray(payload?.scenarios).map((scenario) => ({
    key: scenario?.id, type: "scenario", label: nonEmpty(scenario?.name) || scenario?.targetModel?.name || "Scenario",
    modelName: scenario?.targetModel?.name || "—",
  })).filter((option) => Boolean(option.key)),
];

export default selectFinishedIssueExecution;
