import { resolveResultStructureMetadata } from "../../decisionPlugins/resultStructureMetadata.js";
import {
  normalizeResultStructureOrThrow,
} from "../../decisionPlugins/resultStructures/resultStructureRegistry.js";

export const buildIssueModelExecutionResult = ({
  issue,
  message,
  result,
  structureKey,
  issueUpdates,
  nextCurrentStage,
}) => {
  const normalizedResult = normalizeResultStructureOrThrow({
    ...resolveResultStructureMetadata(issue),
    result,
  });

  return {
    message,
    consensusMeasure: normalizedResult.consensusMeasure,
    rankedAlternatives: normalizedResult.rankedAlternatives,
    collectiveEvaluations: normalizedResult.collectiveEvaluations,
    plotsGraphic: normalizedResult.plotsGraphic,
    modelExecution: {
      kind: "decisionModelsService",
      structureKey,
      apiModelKey: issue.apiModelKey,
      apiEndpointPath: issue.apiEndpoint.path,
      executedAt: new Date(),
    },
    rawOutput: normalizedResult.rawOutput,
    issueUpdates,
    nextCurrentStage,
  };
};
