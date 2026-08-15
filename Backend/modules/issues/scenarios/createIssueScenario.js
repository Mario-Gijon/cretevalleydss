import axios from "axios";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { createBadRequestError, createInternalError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { buildScenarioExecutionContext } from "./buildScenarioExecutionContext.js";
import { executeScenarioModel } from "../modelExecution/index.js";
import { markExecutionApplied, markExecutionApplicationFailed } from "../modelExecution/index.js";
import { createIssueEventOperationMetadata } from "../events/index.js";

const cloneJsonCompatibleOrThrow = (value, field) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw createBadRequestError(`${field} must be JSON-compatible`, { field });
  }
};

const normalizeScenarioCreationInputOrThrow = ({
  targetModelId,
  scenarioName,
  scenarioDescription,
  sourcePhase,
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
  if (!normalizedScenarioName) {
    throw createBadRequestError("scenarioName is required", {
      field: "scenarioName",
    });
  }

  const normalizedScenarioDescription =
    scenarioDescription === undefined || scenarioDescription === null
      ? ""
      : typeof scenarioDescription === "string"
        ? scenarioDescription.trim()
        : null;

  if (normalizedScenarioDescription === null) {
    throw createBadRequestError("scenarioDescription must be a string", {
      field: "scenarioDescription",
    });
  }
  if (normalizedScenarioDescription.length > 320) {
    throw createBadRequestError("scenarioDescription must not exceed 320 characters", {
      field: "scenarioDescription",
    });
  }

  const normalizedSourcePhase =
    sourcePhase === undefined || sourcePhase === null
      ? undefined
      : Number.isInteger(sourcePhase) && sourcePhase >= 0
        ? sourcePhase
        : null;

  if (normalizedSourcePhase === null) {
    throw createBadRequestError("sourcePhase must be a non-negative integer", {
      field: "sourcePhase",
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
    scenarioDescription: normalizedScenarioDescription,
    sourcePhase: normalizedSourcePhase,
    paramOverrides: normalizedParamOverrides,
  };
};

export const createIssueScenario = async ({
  userId,
  issueId,
  targetModelId,
  scenarioName,
  scenarioDescription,
  sourcePhase,
  paramOverrides,
  decisionModelsServiceBaseUrl =
    process.env.DECISION_MODELS_SERVICE_BASE_URL || "http://localhost:7000",
  httpClient = axios,
}) => {
  const normalizedInput = normalizeScenarioCreationInputOrThrow({
    targetModelId,
    scenarioName,
    scenarioDescription,
    sourcePhase,
    paramOverrides,
  });

  const context = await buildScenarioExecutionContext({
    issueId,
    userId,
    targetModelId: normalizedInput.targetModelId,
    sourcePhase: normalizedInput.sourcePhase,
    paramOverrides: normalizedInput.paramOverrides,
  });

  const requestSnapshot = cloneJsonCompatibleOrThrow(
    context.requestPayload,
    "requestSnapshot"
  );
  const {
    standardResult,
    modelExecution,
    rawOutput,
    executionAttempt,
  } = await executeScenarioModel({
    requestPayload: requestSnapshot,
    targetRuntimeSnapshot: context.targetRuntimeSnapshot,
    decisionModelsServiceBaseUrl,
    httpClient,
    executionAttemptInput: { issue: context.issue._id, scope: "scenario", actorType: "user", actorUser: userId, correlationId: createIssueEventOperationMetadata().correlationId, evaluationStage: "alternativeEvaluation", issueStage: context.issue.currentStage, consensusPhase: context.evaluationPhase, modelContext: { modelId: context.targetModel._id, modelName: context.targetModel.name ?? null, apiModelKey: context.targetRuntimeSnapshot.targetApiModelKey ?? null, apiEndpointPath: context.targetRuntimeSnapshot.targetApiEndpoint?.path ?? null, evaluationStructureKey: context.targetRuntimeSnapshot.targetEvaluationStructureKey ?? null, serviceBaseUrl: decisionModelsServiceBaseUrl ?? null, modelKind: "scenario" } },
  });
  if (!executionAttempt?._id || !executionAttempt.startedAt || !executionAttempt.completedAt) {
    throw createInternalError("Scenario execution must return a tracked execution attempt", { field: "executionAttempt" });
  }
  let scenario;
  try { scenario = await IssueScenario.create({
    issue: context.issue._id,
    createdBy: userId,
    name: normalizedInput.scenarioName,
    description: normalizedInput.scenarioDescription,
    targetModel: context.targetModel._id,
    source: {
      consensusPhase: context.evaluationPhase,
      stageResult: context.stageResultId,
      domainType: context.domainType,
    },
    config: {
      parameterOverrides: cloneJsonCompatibleOrThrow(
        normalizedInput.paramOverrides,
        "paramOverrides"
      ),
    },
    requestSnapshot,
    result: {
      standardResult: cloneJsonCompatibleOrThrow(standardResult, "standardResult"),
      modelExecution: cloneJsonCompatibleOrThrow(modelExecution, "modelExecution"),
      rawOutput: cloneJsonCompatibleOrThrow(rawOutput, "rawOutput"),
    },
    execution: {
      attemptId: executionAttempt._id,
      startedAt: executionAttempt.startedAt,
      completedAt: executionAttempt.completedAt,
    },
  }); } catch (error) { await markExecutionApplicationFailed({ attemptId: executionAttempt._id, error }); throw error; }
  await markExecutionApplied({ attemptId: executionAttempt._id, entityType: "scenario", entityId: scenario._id, resultSnapshot: scenario.toObject() });

  return {
    scenarioId: scenario._id,
  };
};
