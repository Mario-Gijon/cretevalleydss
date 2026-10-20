import { normalizeRankingResult } from "./normalize.js";

const SCENARIO_NORMALIZATION_MESSAGES = {
  resultRequired: "Scenario model execution result is required",
  rankedAlternativesRequired:
    "Scenario model execution result.rankedAlternatives must be a non-empty array",
  rankedAlternativeInvalidEntry: "Invalid rankedAlternatives entry",
  rankedAlternativeNameRequired: "rankedAlternatives entry requires name",
  rankedAlternativeScoreRequired:
    "rankedAlternatives entry requires finite score",
  rankedAlternativeRankRequired:
    "rankedAlternatives entry requires positive rank",
  collectiveEvaluationsRequired:
    "Scenario model execution result.collectiveEvaluations is required",
  plotsGraphicRequired: "Scenario model execution result.plotsGraphic is required",
  consensusMeasureInvalid:
    "Scenario model execution result.consensusMeasure must be finite or null",
  rawOutputRequired: "Scenario model execution result.rawOutput is required",
};

const validateAndNormalizeRankingResult = ({
  result,
  messages = {},
  options = {},
  context,
}) =>
  normalizeRankingResult({
    result,
    messages: {
      ...(context === "scenario" ? SCENARIO_NORMALIZATION_MESSAGES : {}),
      ...messages,
    },
    options,
  });

export const rankingV1ResultStructure = Object.freeze({
  key: "ranking",
  version: 1,
  implementationStatus: "ready",
  validateAndNormalize: validateAndNormalizeRankingResult,
  projectNormalizedResult: ({ result, target, context = {} }) => {
    if (
      target !== "stagePersistence" &&
      target !== "executionResponse" &&
      target !== "scenarioInput" &&
      target !== "stateSnapshot" &&
      target !== "activeIssueResponse"
    ) {
      throw new TypeError(`Unsupported ranking result projection '${target}'`);
    }

    if (target === "scenarioInput") {
      return {
        consensusMeasure: result.consensusMeasure ?? null,
        rankedAlternatives: Array.isArray(result.rankedAlternatives)
          ? result.rankedAlternatives
          : [],
        collectiveEvaluations: result.collectiveEvaluations ?? {},
        plotsGraphic: result.plotsGraphic ?? {},
      };
    }

    if (target === "stateSnapshot") {
      return {
        consensusMeasure: result.consensusMeasure ?? null,
        collectiveEvaluations: result.collectiveEvaluations ?? null,
        rankedAlternatives: result.rankedAlternatives ?? null,
      };
    }

    if (target === "activeIssueResponse") {
      return {
        consensusMeasure: result.consensusMeasure,
        rankedAlternatives: result.rankedAlternatives,
        collectiveEvaluations: result.collectiveEvaluations,
        feedback: context.rawOutput?.feedback,
        recommendations: context.rawOutput?.recommendations,
      };
    }

    return {
      consensusMeasure: result.consensusMeasure,
      rankedAlternatives: result.rankedAlternatives,
      collectiveEvaluations: result.collectiveEvaluations,
      plotsGraphic: result.plotsGraphic,
    };
  },
});
