import { executeTrackedDecisionModelRequest } from "./executionEvidence.js";
import { resolveResultStructureMetadata } from "../../decisionPlugins/resultStructureMetadata.js";
import {
  RESULT_STRUCTURE_REGISTRY,
  isResultStructureCapabilityEnabled,
  normalizeResultStructureOrThrow,
} from "../../decisionPlugins/resultStructures/resultStructureRegistry.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

export const executeScenarioModel = async ({
  requestPayload,
  targetRuntimeSnapshot,
  decisionModelsServiceBaseUrl,
  httpClient,
  executionAttemptInput,
  resultStructureContext = {},
  resultStructureRegistry = RESULT_STRUCTURE_REGISTRY,
}) => {
  if (targetRuntimeSnapshot?.issueExecutionAuthorized !== true) {
    throw createBadRequestError(
      "Selected model is not authorized for issue execution",
      {
        code: "ISSUE_MODEL_EXECUTION_NOT_AUTHORIZED",
        field: "targetModelId",
        details: {
          issueExecutionAuthorized:
            targetRuntimeSnapshot?.issueExecutionAuthorized ?? null,
        },
      }
    );
  }

  const resultStructureMetadata = resolveResultStructureMetadata({
    resultStructureKey: targetRuntimeSnapshot.targetResultStructureKey,
    resultStructureVersion: targetRuntimeSnapshot.targetResultStructureVersion,
  }, { registry: resultStructureRegistry });
  if (
    !isResultStructureCapabilityEnabled({
      ...resultStructureMetadata,
      capability: "issueExecution",
      registry: resultStructureRegistry,
    })
  ) {
    throw createBadRequestError(
      "The selected result structure is not enabled for model execution",
      { field: "targetModelId" }
    );
  }
  const tracked = await executeTrackedDecisionModelRequest({
    attemptInput: executionAttemptInput,
    apiEndpointPath: targetRuntimeSnapshot.targetApiEndpoint.path,
    requestPayload,
    errorMessage: "Scenario model execution failed",
    decisionModelsServiceBaseUrl,
    httpClient,
    normalize: async (modelOutput) => {
      const standardResult = normalizeResultStructureOrThrow({
        ...resultStructureMetadata,
        result: modelOutput,
        context: {
          kind: "scenario",
          ...resultStructureContext,
          authorizedAlternativeIds: requestPayload.context?.alternatives?.map(
            (alternative) => alternative.id
          ),
        },
        options: {
          requireResultObject: false,
          validateAlternativeIdType: false,
          enforceRankOrdering: false,
        },
        registry: resultStructureRegistry,
      });
      return {
        ...resultStructureMetadata,
        standardResult,
        rawOutput: standardResult.rawOutput ?? modelOutput,
      };
    },
  });
  const { standardResult } = tracked.result;

  const modelExecution = {
    kind: "decisionModelsService",
    structureKey:
      targetRuntimeSnapshot.targetEvaluationStructureKey,
    apiModelKey: targetRuntimeSnapshot.targetApiModelKey,
    apiEndpointPath: targetRuntimeSnapshot.targetApiEndpoint.path,
    executedAt: tracked.attempt.completedAt,
    executionAttemptId: String(tracked.attempt._id), startedAt: tracked.attempt.startedAt, completedAt: tracked.attempt.completedAt, durationMs: tracked.attempt.durationMs,
  };

  return {
    ...resultStructureMetadata,
    standardResult,
    modelExecution,
    rawOutput: tracked.result.rawOutput,
    executionAttempt: tracked.attempt,
  };
};
