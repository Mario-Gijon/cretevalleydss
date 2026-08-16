import { cloneSerializable, toIsoOrNull, toNullableId, toRequiredId } from "./serializers.shared.js";
import { resolveModelPaperUrl } from "./modelPaperUrl.js";

const serializeCreator = (creator) => creator ? {
  id: toRequiredId(creator, "scenario creator"), name: creator.name ?? null, email: creator.email ?? null,
} : null;

const isReplayPhase = (phaseResult) => Number.isInteger(phaseResult?.phase) && phaseResult.phase >= 0;

const serializePhaseResult = (phaseResult) => ({
  phase: phaseResult.phase,
  source: {
    stageResult: toNullableId(phaseResult.source?.stageResult),
    domainType: phaseResult.source?.domainType ?? null,
  },
  requestSnapshot: cloneSerializable(phaseResult.requestSnapshot, {}),
  standardizedOutput: cloneSerializable(phaseResult.result?.standardResult, {}),
  consensusMeasure: phaseResult.result?.standardResult?.consensusMeasure ?? null,
  modelSpecificOutput: cloneSerializable(phaseResult.result?.modelExecution, {}),
  rawOutput: cloneSerializable(phaseResult.result?.rawOutput, {}),
  execution: {
    attemptId: toNullableId(phaseResult.execution?.attemptId),
    startedAt: toIsoOrNull(phaseResult.execution?.startedAt),
    completedAt: toIsoOrNull(phaseResult.execution?.completedAt),
  },
});

// Development databases may still contain the former single-phase shape.
// Normalize it at the payload boundary so the frontend consumes one contract.
const serializeLegacyPhaseResult = (scenario) => ({
  phase: Number.isInteger(scenario.source?.consensusPhase) ? scenario.source.consensusPhase : 0,
  source: {
    stageResult: toNullableId(scenario.source?.stageResult),
    domainType: scenario.source?.domainType ?? null,
  },
  requestSnapshot: cloneSerializable(scenario.requestSnapshot, {}),
  standardizedOutput: cloneSerializable(scenario.result?.standardResult, {}),
  consensusMeasure: scenario.result?.standardResult?.consensusMeasure ?? null,
  modelSpecificOutput: cloneSerializable(scenario.result?.modelExecution, {}),
  rawOutput: cloneSerializable(scenario.result?.rawOutput, {}),
  execution: {
    attemptId: toNullableId(scenario.execution?.attemptId),
    startedAt: toIsoOrNull(scenario.execution?.startedAt),
    completedAt: toIsoOrNull(scenario.execution?.completedAt),
  },
});

const serializeScenarioPhaseResults = (scenario) => {
  const stored = Array.isArray(scenario.phaseResults)
    ? scenario.phaseResults.filter(isReplayPhase)
    : [];
  const phaseResults = stored.length ? stored.map(serializePhaseResult) : [serializeLegacyPhaseResult(scenario)];
  return phaseResults.sort((left, right) => left.phase - right.phase);
};

export const serializeScenarios = ({ scenarios }) => scenarios.map((scenario) => ({
  id: toRequiredId(scenario, "scenario"),
  name: scenario.name ?? "",
  description: typeof scenario.description === "string" && scenario.description.trim() ? scenario.description.trim() : null,
  createdBy: serializeCreator(scenario.createdBy),
  targetModel: {
    id: toRequiredId(scenario.targetModel, "scenario target model"),
    name: scenario.targetModel.name,
    paperUrl: resolveModelPaperUrl(scenario.targetModel),
  },
  config: cloneSerializable(scenario.config, {}),
  phaseResults: serializeScenarioPhaseResults(scenario),
  createdAt: toIsoOrNull(scenario.createdAt),
  updatedAt: toIsoOrNull(scenario.updatedAt),
}));

export const getScenarioCompleteness = () => [];
