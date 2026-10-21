import { normalizeSortingResult } from "./normalize.js";

const projectStandardSortingResult = (result) => ({
  categories: result.categories,
  categoryOrderSemantics: result.categoryOrderSemantics,
  assignments: result.assignments,
  ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
});

export const sortingV1ResultStructure = Object.freeze({
  key: "sorting",
  version: 1,
  implementationStatus: "ready",
  modelParameterContexts: Object.freeze({
    authorizedCategories: "orderedCategories",
  }),
  capabilities: Object.freeze({
    issueExecution: true,
    consensus: false,
    resultsAnalysis: false,
  }),
  validateAndNormalize: normalizeSortingResult,
  projectNormalizedResult: ({ result, target }) => {
    if (target === "finishedIssuePhaseResult") {
      return {
        ...projectStandardSortingResult(result),
        standardizedOutput: result,
      };
    }

    if (target === "finishedIssueScenarioPhaseResult") {
      return { standardizedOutput: result };
    }

    if (target === "finishedIssueListSummary") {
      return {
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        sortingSummary: {
          categoryCount: result.categories.length,
          assignedAlternativeCount: result.assignments.length,
        },
      };
    }

    if (
      target === "stagePersistence" ||
      target === "executionResponse" ||
      target === "scenarioInput" ||
      target === "stateSnapshot" ||
      target === "activeIssueResponse"
    ) {
      return projectStandardSortingResult(result);
    }

    throw new TypeError(`Unsupported sorting result projection '${target}'`);
  },
});
