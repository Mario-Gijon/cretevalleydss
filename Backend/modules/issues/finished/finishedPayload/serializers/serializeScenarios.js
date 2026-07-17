import {
  cloneSerializable,
  toIsoOrNull,
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
    status: scenario.status,
    error: scenario.error ?? null,
    targetModel: {
      id: toRequiredId(scenario.targetModel, "scenario target model"),
      name: scenario.targetModelName,
      paperUrl: resolveModelPaperUrl(scenario.targetModel),
      apiModelKey: scenario.targetApiModelKey,
      apiEndpoint: cloneSerializable(scenario.targetApiEndpoint, null),
      evaluationStructureKey: scenario.targetEvaluationStructureKey,
      supportsConsensus: scenario.targetSupportsConsensus === true,
    },
    configuration: {
      evaluationStructureKey: scenario.evaluationStructureKey,
      criteriaWeightingStructureKey: scenario.criteriaWeightsStructureKey ?? null,
      domainType: scenario.domainType ?? null,
      configuredParameters: cloneSerializable(scenario.config?.modelParameters, {}),
      normalizedParameters: cloneSerializable(scenario.config?.normalizedModelParameters, {}),
    },
    inputs: cloneSerializable(scenario.inputs, {}),
    outputs: cloneSerializable(scenario.outputs, {}),
    computedAt: toIsoOrNull(
      scenario.outputs?.modelExecution?.executedAt ?? scenario.createdAt
    ),
    createdAt: toIsoOrNull(scenario.createdAt),
    updatedAt: toIsoOrNull(scenario.updatedAt),
  }));

export const getScenarioCompleteness = ({ scenarios }) =>
  scenarios.flatMap((scenario) => {
    const criteria = Array.isArray(scenario.inputs?.criteria) ? scenario.inputs.criteria : [];
    if (!criteria.length) return [];

    return [
      {
        code: "SCENARIO_CRITERION_HIERARCHY_NOT_STORED",
        scenarioId: toRequiredId(scenario, "scenario"),
      },
      {
        code: "SCENARIO_CRITERION_DOMAIN_ASSIGNMENTS_NOT_STORED",
        scenarioId: toRequiredId(scenario, "scenario"),
      },
    ];
  });
