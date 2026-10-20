import { resolveResultStructureMetadata } from "../../decisionPlugins/resultStructureMetadata.js";
import {
  RESULT_STRUCTURE_REGISTRY,
  normalizeResultStructureOrThrow,
} from "../../decisionPlugins/resultStructures/resultStructureRegistry.js";

export const buildIssueModelExecutionResult = ({
  issue,
  message,
  result,
  structureKey,
  issueUpdates,
  nextCurrentStage,
  resultStructureRegistry = RESULT_STRUCTURE_REGISTRY,
}) => {
  const resultStructureMetadata = resolveResultStructureMetadata(
    issue,
    { registry: resultStructureRegistry }
  );
  const normalizedResult = normalizeResultStructureOrThrow({
    ...resultStructureMetadata,
    result,
    registry: resultStructureRegistry,
  });

  return {
    message,
    ...resultStructureMetadata,
    standardResult: normalizedResult,
    modelExecution: {
      kind: "decisionModelsService",
      structureKey,
      apiModelKey: issue.apiModelKey,
      apiEndpointPath: issue.apiEndpoint.path,
      executedAt: new Date(),
    },
    rawOutput: normalizedResult.rawOutput ?? result,
    issueUpdates,
    nextCurrentStage,
  };
};
