import {
  buildCriteriaWeightingRequestPayload,
} from "./buildCriteriaWeightingRequestPayload.js";
import { buildCriteriaWeightingExecutionResult } from "./buildCriteriaWeightingExecutionResult.js";
import { buildIssueModelExecutionResult } from "./buildIssueModelExecutionResult.js";
import { buildIssueModelRequestPayload } from "./buildIssueModelRequestPayload.js";
import { executeTrackedDecisionModelRequest } from "./executionEvidence.js";
import { resolveResultStructureMetadata } from "../../decisionPlugins/resultStructureMetadata.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { buildIssueResultStructureContextOrThrow } from "./buildIssueResultStructureContext.js";
import { assertPopulatedIssueModelUsableOrThrow } from "../issueModelUsability.js";
import { validateIssueModelRuntimeConfigOrThrow } from "../creation/validateIssueModelRuntime.js";
import { validateAHPSortIExecutionEvaluationsOrThrow } from "./validateAHPSortIExecutionEvaluations.js";

const normalizeRuntimeKey = (value) =>
  typeof value === "string" ? value.trim().replace(/^\/+|\/+$/g, "") : "";

const normalizeRuntimePath = (value) => {
  const normalized = normalizeRuntimeKey(value);
  return normalized ? `/${normalized}` : null;
};

const normalizeRuntimeMethod = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const assertIssueRuntimeMatchesModelOrThrow = ({ issue, model, runtime }) => {
  const mismatchedFields = [];
  let issueResultStructure = null;

  try {
    issueResultStructure = resolveResultStructureMetadata(issue);
  } catch {
    mismatchedFields.push("resultStructure");
  }

  if (model.modelKind !== "issue") mismatchedFields.push("modelKind");
  if (normalizeRuntimeKey(issue.apiModelKey) !== runtime.apiModelKey) {
    mismatchedFields.push("apiModelKey");
  }
  if (normalizeRuntimePath(issue.apiEndpoint?.path) !== runtime.apiEndpoint.path) {
    mismatchedFields.push("apiEndpoint.path");
  }
  if (
    normalizeRuntimeMethod(issue.apiEndpoint?.method) !==
    runtime.apiEndpoint.method
  ) {
    mismatchedFields.push("apiEndpoint.method");
  }
  if (issue.evaluationStructureKey !== runtime.evaluationStructureKey) {
    mismatchedFields.push("evaluationStructureKey");
  }
  if (
    issueResultStructure?.resultStructureKey !== runtime.resultStructureKey ||
    issueResultStructure?.resultStructureVersion !== runtime.resultStructureVersion
  ) {
    if (!mismatchedFields.includes("resultStructure")) {
      mismatchedFields.push("resultStructure");
    }
  }
  if (issue.supportsConsensus === true && runtime.supportsConsensus !== true) {
    mismatchedFields.push("supportsConsensus");
  }
  if (
    issue.simulateConsensus === true &&
    runtime.supportsConsensusSimulation !== true
  ) {
    mismatchedFields.push("supportsConsensusSimulation");
  }

  if (mismatchedFields.length > 0) {
    throw createBadRequestError(
      "Selected model runtime no longer matches the issue configuration",
      {
        code: "ISSUE_MODEL_RUNTIME_MISMATCH",
        field: "modelId",
        details: { mismatchedFields },
      }
    );
  }
};

export const executeAlternativeEvaluationModel = async ({
  issue,
  structureKey,
  evaluations,
  phase,
  expertWeightsByExpertId = null,
  decisionModelsServiceBaseUrl,
  httpClient,
  message,
  executionErrorMessage = "Alternative evaluation model execution failed",
  issueUpdates = {},
  nextCurrentStage = null,
  executionAttemptInput,
}) => {
  const model = assertPopulatedIssueModelUsableOrThrow(issue, {
    field: "resultStructureKey",
  });
  const modelRuntime = validateIssueModelRuntimeConfigOrThrow(model);
  assertIssueRuntimeMatchesModelOrThrow({
    issue,
    model,
    runtime: modelRuntime,
  });
  validateAHPSortIExecutionEvaluationsOrThrow({
    apiModelKey: modelRuntime.apiModelKey,
    evaluations,
    modelParameters: issue.modelParameters,
  });

  const requestPayload = await buildIssueModelRequestPayload({
    issue,
    structureKey,
    evaluations,
    phase,
    expertWeightsByExpertId,
  });
  const resultStructureContext = await buildIssueResultStructureContextOrThrow({
    issue,
  });

  const tracked = await executeTrackedDecisionModelRequest({
    attemptInput: executionAttemptInput,
    apiEndpointPath: issue.apiEndpoint.path,
    requestPayload,
    errorMessage: executionErrorMessage,
    decisionModelsServiceBaseUrl,
    httpClient,
    normalize: async (result) => buildIssueModelExecutionResult({
      issue,
      message,
      result,
      structureKey,
      issueUpdates,
      nextCurrentStage,
      context: {
        kind: "issue",
        ...resultStructureContext,
        authorizedAlternativeIds: requestPayload.context.alternatives.map(
          (alternative) => alternative.id
        ),
      },
    }),
  });
  return { ...tracked.result, executionAttempt: tracked.attempt };
};

export const executeCriteriaWeightingModel = async ({
  issue,
  structure,
  structureKey,
  evaluations,
  phase,
  expertWeightsByExpertId = null,
  decisionModelsServiceBaseUrl,
  httpClient,
  executionAttemptInput,
  normalizeResult = null,
}) => {
  const requestPayload = await buildCriteriaWeightingRequestPayload({
    issue,
    structureKey,
    evaluations,
    phase,
    expertWeightsByExpertId,
  });

  const apiEndpointPath = issue.criteriaWeightingApiEndpoint?.path;
  const apiModelKey = issue.criteriaWeightingApiModelKey;
  const tracked = await executeTrackedDecisionModelRequest({ attemptInput: executionAttemptInput, apiEndpointPath, requestPayload, errorMessage: "Criteria weighting model execution failed", decisionModelsServiceBaseUrl, httpClient,
    normalize: async (result) => { const built = buildCriteriaWeightingExecutionResult({ structureKey, message: result.message, result, apiModelKey, apiEndpointPath }); return normalizeResult ? normalizeResult(built) : built; }, });
  return { ...tracked.result, executionAttempt: tracked.attempt };
};
