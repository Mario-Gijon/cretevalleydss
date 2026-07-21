import axios from "axios";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { buildScenarioExecutionContext } from "./buildScenarioExecutionContext.js";
import { executeScenarioModel } from "../modelExecution/index.js";

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
    typeof scenarioDescription === "string"
      ? scenarioDescription.trim()
      : null;

  if (normalizedScenarioDescription === null) {
    throw createBadRequestError("scenarioDescription must be a string", {
      field: "scenarioDescription",
    });
  }
  if (!normalizedScenarioDescription) {
    throw createBadRequestError("scenarioDescription is required", {
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
  const startedAt = new Date();
  const {
    standardResult,
    modelExecution,
    rawOutput,
  } = await executeScenarioModel({
    requestPayload: requestSnapshot,
    targetRuntimeSnapshot: context.targetRuntimeSnapshot,
    decisionModelsServiceBaseUrl,
    httpClient,
  });
  const completedAt = new Date();

  const scenario = await IssueScenario.create({
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
      startedAt,
      completedAt,
    },
  });

  return {
    scenarioId: scenario._id,
  };
};
