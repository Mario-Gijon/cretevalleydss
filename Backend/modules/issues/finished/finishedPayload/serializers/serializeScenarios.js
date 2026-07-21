import {
  cloneSerializable,
  toIsoOrNull,
  toNullableId,
  toRequiredId,
} from "./serializers.shared.js";
import { resolveModelPaperUrl } from "./modelPaperUrl.js";

const serializeCreator = (creator) =>
  creator
    ? {
        id: toRequiredId(creator, "scenario creator"),
        name: creator.name ?? null,
        email: creator.email ?? null,
      }
    : null;

export const serializeScenarios = ({ scenarios }) =>
  scenarios.map((scenario) => ({
    id: toRequiredId(scenario, "scenario"),
    name: scenario.name ?? "",
    description:
      typeof scenario.description === "string" && scenario.description.trim()
        ? scenario.description.trim()
        : null,
    createdBy: serializeCreator(scenario.createdBy),
    targetModel: {
      id: toRequiredId(scenario.targetModel, "scenario target model"),
      name: scenario.targetModel.name,
      paperUrl: resolveModelPaperUrl(scenario.targetModel),
    },
    source: {
      consensusPhase: scenario.source?.consensusPhase ?? null,
      stageResult: toNullableId(scenario.source?.stageResult),
      domainType: scenario.source?.domainType ?? null,
    },
    config: cloneSerializable(scenario.config, {}),
    requestSnapshot: cloneSerializable(scenario.requestSnapshot, {}),
    result: cloneSerializable(scenario.result, {}),
    execution: {
      status: scenario.execution?.status ?? null,
      error: cloneSerializable(scenario.execution?.error, null),
      startedAt: toIsoOrNull(scenario.execution?.startedAt),
      completedAt: toIsoOrNull(scenario.execution?.completedAt),
    },
    createdAt: toIsoOrNull(scenario.createdAt),
    updatedAt: toIsoOrNull(scenario.updatedAt),
  }));

export const getScenarioCompleteness = () => [];
