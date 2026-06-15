import axios from "axios";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { buildScenarioExecutionContext } from "./buildScenarioExecutionContext.js";
import { executeScenarioModel } from "../modelExecution/index.js";

const normalizeScenarioCreationInputOrThrow = ({
  targetModelId,
  scenarioName,
  paramOverrides,
}) => {
  if (typeof targetModelId !== "string" || targetModelId.trim() === "") {
    throw createBadRequestError("targetModelId is required", {
      field: "targetModelId",
    });
  }

  const normalizedScenarioName =
    scenarioName === undefined || scenarioName === null
      ? ""
      : typeof scenarioName === "string"
        ? scenarioName.trim()
        : null;

  if (normalizedScenarioName === null) {
    throw createBadRequestError("scenarioName must be a string", {
      field: "scenarioName",
    });
  }

  const normalizedParamOverrides =
    paramOverrides === undefined || paramOverrides === null
      ? {}
      : isPlainObject(paramOverrides)
        ? paramOverrides
        : null;

  if (normalizedParamOverrides === null) {
    throw createBadRequestError("paramOverrides must be an object", {
      field: "paramOverrides",
    });
  }

  return {
    targetModelId: targetModelId.trim(),
    scenarioName: normalizedScenarioName,
    paramOverrides: normalizedParamOverrides,
  };
};

export const createIssueScenario = async ({
  userId,
  issueId,
  targetModelId,
  scenarioName,
  paramOverrides,
  apiModelsBaseUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000",
  httpClient = axios,
}) => {
  const normalizedInput = normalizeScenarioCreationInputOrThrow({
    targetModelId,
    scenarioName,
    paramOverrides,
  });

  const context = await buildScenarioExecutionContext({
    issueId,
    userId,
    targetModelId: normalizedInput.targetModelId,
    paramOverrides: normalizedInput.paramOverrides,
  });

  const {
    standardResult,
    modelExecution,
    rawOutput,
  } = await executeScenarioModel({
    requestPayload: context.requestPayload,
    targetRuntimeSnapshot: context.targetRuntimeSnapshot,
    apiModelsBaseUrl,
    httpClient,
  });

  const scenario = await IssueScenario.create({
    issue: context.issue._id,
    createdBy: userId,
    name: normalizedInput.scenarioName,
    targetModel: context.targetModel._id,
    targetModelName: context.targetModel.name,
    targetApiModelKey: context.targetRuntimeSnapshot.targetApiModelKey,
    targetApiEndpoint: context.targetRuntimeSnapshot.targetApiEndpoint,
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
