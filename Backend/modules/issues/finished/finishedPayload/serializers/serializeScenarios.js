import { cloneSerializable, toIsoOrNull, toNullableId, toRequiredId } from "./serializers.shared.js";
import { resolveModelPaperUrl } from "./modelPaperUrl.js";

const serializeCreator = (creator) => creator ? {
  id: toRequiredId(creator, "scenario creator"), name: creator.name ?? null, email: creator.email ?? null,
} : null;

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
  phaseResults: scenario.phaseResults
    .slice()
    .sort((left, right) => left.phase - right.phase)
    .map(serializePhaseResult),
  createdAt: toIsoOrNull(scenario.createdAt),
  updatedAt: toIsoOrNull(scenario.updatedAt),
}));

export const getScenarioCompleteness = () => [];
