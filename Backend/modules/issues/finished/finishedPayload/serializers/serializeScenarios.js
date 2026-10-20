import { cloneSerializable, toIsoOrNull, toNullableId, toRequiredId } from "./serializers.shared.js";
import { resolveModelPaperUrl } from "./modelPaperUrl.js";
import { resolveResultStructureMetadata } from "../../../../decisionPlugins/resultStructureMetadata.js";
import {
  projectNormalizedResultOrThrow,
  RESULT_STRUCTURE_REGISTRY,
} from "../../../../decisionPlugins/resultStructures/resultStructureRegistry.js";

const serializeCreator = (creator) => creator ? {
  id: toRequiredId(creator, "scenario creator"), name: creator.name ?? null, email: creator.email ?? null,
} : null;

const serializePhaseResult = (phaseResult, registry) => {
  const result = phaseResult.result ?? {};
  const resultStructureMetadata = resolveResultStructureMetadata(result, { registry });
  const projectedResult = projectNormalizedResultOrThrow({
    ...resultStructureMetadata,
    result: result.standardResult ?? {},
    target: "finishedIssueScenarioPhaseResult",
    registry,
  });

  return {
    ...cloneSerializable(projectedResult, {}),
    phase: phaseResult.phase,
    source: {
      stageResult: toNullableId(phaseResult.source?.stageResult),
      domainType: phaseResult.source?.domainType ?? null,
    },
    requestSnapshot: cloneSerializable(phaseResult.requestSnapshot, {}),
    ...resultStructureMetadata,
    modelSpecificOutput: cloneSerializable(result.modelExecution, {}),
    rawOutput: cloneSerializable(result.rawOutput, {}),
    execution: {
      attemptId: toNullableId(phaseResult.execution?.attemptId),
      startedAt: toIsoOrNull(phaseResult.execution?.startedAt),
      completedAt: toIsoOrNull(phaseResult.execution?.completedAt),
    },
  };
};

export const serializeScenarios = ({
  scenarios,
  registry = RESULT_STRUCTURE_REGISTRY,
}) => scenarios.map((scenario) => ({
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
    .map((phaseResult) => serializePhaseResult(phaseResult, registry)),
  createdAt: toIsoOrNull(scenario.createdAt),
  updatedAt: toIsoOrNull(scenario.updatedAt),
}));

export const getScenarioCompleteness = () => [];
