import { serializePersistedExecutionAnalysis } from "../../../resultsAnalysis/index.js";
import { resolveResultStructureMetadata } from "../../../../decisionPlugins/resultStructureMetadata.js";
import {
  isResultStructureCapabilityEnabled,
} from "../../../../decisionPlugins/resultStructures/resultStructureRegistry.js";

const supportsAnalysis = (metadata, registry) =>
  isResultStructureCapabilityEnabled({
    ...metadata,
    capability: "resultsAnalysis",
    registry,
  });

export const serializeResultsAnalysis = ({
  analyses,
  scenarios,
  issue,
  registry,
}) => {
  const currentScenarioIds = new Set((scenarios || []).map((scenario) => String(scenario._id)));
  const scenariosById = new Map((scenarios || []).map((scenario) => [String(scenario._id), scenario]));
  const executions = (analyses || [])
    .filter((entry) => {
      if (entry.executionKey === "base") {
        return !issue || supportsAnalysis(resolveResultStructureMetadata(issue), registry);
      }

      if (
        entry.executionType !== "scenario" ||
        !entry.scenario ||
        !currentScenarioIds.has(String(entry.scenario))
      ) {
        return false;
      }

      const scenario = scenariosById.get(String(entry.scenario));
      const phaseResults = scenario?.phaseResults ?? [];
      return phaseResults.length > 0 && phaseResults.every((phaseResult) =>
        supportsAnalysis(
          resolveResultStructureMetadata(phaseResult.result ?? {}),
          registry
        )
      );
    })
    .map(serializePersistedExecutionAnalysis)
    .sort((left, right) => {
      if (left.executionKey === "base") return -1;
      if (right.executionKey === "base") return 1;
      return left.executionKey.localeCompare(right.executionKey);
    });
  return { executions };
};
