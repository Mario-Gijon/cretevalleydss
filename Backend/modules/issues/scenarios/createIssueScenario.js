import axios from "axios";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../services/modelApi/modelResponse.js";
import { buildScenarioExecutionContext } from "./buildScenarioExecutionContext.js";
import { normalizeScenarioExecutionResultOrThrow } from "./normalizeScenarioExecutionResult.js";

export const createIssueScenario = async ({
  userId,
  issueId,
  targetModelId,
  scenarioName = "",
  paramOverrides = {},
}) => {
  const context = await buildScenarioExecutionContext({
    issueId,
    userId,
    targetModelId,
    paramOverrides,
  });

  let response;
  try {
    response = await axios.post(
      `${process.env.ORIGIN_APIMODELS || "http://localhost:7000"}${
        context.targetRuntimeSnapshot.targetApiEndpoint.path
      }`,
      context.requestPayload
    );
  } catch (error) {
    throw createModelApiRequestError(error, "Scenario model execution failed");
  }

  const rawResult = unwrapModelApiResponse(response, "Scenario model execution failed");

  const {
    standardResult,
    rawOutput,
  } = normalizeScenarioExecutionResultOrThrow({ result: rawResult });

  const modelExecution = {
    kind: "apiModels",
    structureKey:
      context.targetRuntimeSnapshot.targetAlternativeEvaluationStructureKey,
    apiModelKey: context.targetRuntimeSnapshot.targetApiModelKey,
    apiEndpointPath: context.targetRuntimeSnapshot.targetApiEndpoint.path,
    executedAt: new Date(),
  };

  const scenario = await IssueScenario.create({
    issue: context.issue._id,
    createdBy: userId,
    name: String(scenarioName || "").trim(),
    targetModel: context.targetModel._id,
    targetModelName: context.targetModel.name,
    targetApiModelKey: context.targetRuntimeSnapshot.targetApiModelKey,
    targetApiEndpoint: context.targetRuntimeSnapshot.targetApiEndpoint,
    targetModelFamilyKey: context.targetRuntimeSnapshot.targetModelFamilyKey,
    targetModelVersion: context.targetRuntimeSnapshot.targetModelVersion,
    targetVersionLabel: context.targetRuntimeSnapshot.targetVersionLabel,
    targetAlternativeEvaluationStructureKey:
      context.targetRuntimeSnapshot.targetAlternativeEvaluationStructureKey,
    targetSupportsConsensus: context.targetRuntimeSnapshot.targetSupportsConsensus,
    alternativeEvaluationStructureKey: context.issue.alternativeEvaluationStructureKey,
    criteriaWeightingStructureKey: context.issue.criteriaWeightingStructureKey,
    domainType: context.domainType,
    status: "done",
    config: {
      modelParameters: context.paramsUsed,
      normalizedModelParameters: context.normalizedParams,
    },
    inputs: {
      consensusPhaseUsed: context.evaluationPhase,
      expertsOrder: context.expertsOrder,
      alternatives: context.alternatives.map((alternative) => ({
        id: alternative._id,
        name: alternative.name,
      })),
      criteria: context.criteria.map((criterion) => ({
        id: criterion._id,
        name: criterion.name,
        criterionType: criterion.type,
      })),
      weightsUsed: context.weightsUsed,
      evaluationPayloads: context.evaluationPayloads,
      context: context.scenarioExecutionContext,
    },
    outputs: {
      standardResult,
      modelExecution,
      rawOutput,
    },
  });

  return {
    scenarioId: scenario._id,
  };
};
