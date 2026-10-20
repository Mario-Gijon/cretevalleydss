import { normalizeRankingResult } from "./normalize.js";
import { toIdString } from "../../../../../../utils/common/ids.js";

const cloneSerializable = (value, fallback) => {
  if (value === undefined) return fallback;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

const serializeRanking = ({ rankedAlternatives, alternatives }) => {
  if (!Array.isArray(rankedAlternatives)) return [];

  const alternativesById = new Set(alternatives.map((alternative) => alternative.id));
  const alternativeIdsByName = alternatives.reduce((map, alternative) => {
    if (!map.has(alternative.name)) map.set(alternative.name, []);
    map.get(alternative.name).push(alternative.id);
    return map;
  }, new Map());

  return rankedAlternatives.map((entry) => {
    const providedId = toIdString(entry?.alternativeId) || null;
    const name = typeof entry?.name === "string" ? entry.name : null;
    const resolvedId =
      providedId && alternativesById.has(providedId)
        ? providedId
        : name && alternativeIdsByName.get(name)?.length === 1
          ? alternativeIdsByName.get(name)[0]
          : null;
    const classification =
      typeof entry?.classification === "string" && entry.classification.trim()
        ? entry.classification.trim()
        : null;
    const resultLabel =
      typeof entry?.resultLabel === "string" && entry.resultLabel.trim()
        ? entry.resultLabel.trim()
        : null;

    return {
      alternativeId: resolvedId,
      name,
      score: entry?.score ?? null,
      rank: entry?.rank ?? null,
      ...(classification ? { classification } : {}),
      ...(resultLabel ? { resultLabel } : {}),
    };
  });
};

const projectFinishedIssuePhaseResult = ({ result, context }) => {
  const rankedAlternatives = serializeRanking({
    rankedAlternatives: result.rankedAlternatives,
    alternatives: context.alternatives ?? [],
  });
  const consensusMeasure =
    typeof result.consensusMeasure === "number" && Number.isFinite(result.consensusMeasure)
      ? result.consensusMeasure
      : null;
  const collectiveEvaluations = cloneSerializable(result.collectiveEvaluations, {});
  const plotsGraphic = cloneSerializable(result.plotsGraphic, {});

  return {
    consensusMeasure,
    rankedAlternatives,
    collectiveEvaluationId: context.phaseResultId,
    plotsGraphic,
    standardizedOutput: {
      rankedAlternatives,
      consensusMeasure,
      collectiveEvaluations,
      plotsGraphic,
    },
  };
};

const projectFinishedIssueListSummary = ({ result, context }) => {
  const topAlternatives = (Array.isArray(result.rankedAlternatives)
    ? result.rankedAlternatives
    : [])
    .map((alternative, index) => ({
      alternativeId: toIdString(alternative?.alternativeId),
      name:
        typeof alternative?.name === "string" && alternative.name.trim()
          ? alternative.name.trim()
          : null,
      rank: Number(alternative?.rank),
      score: alternative?.score,
      index,
    }))
    .filter(
      (alternative) =>
        alternative.alternativeId &&
        alternative.name &&
        Number.isFinite(alternative.rank) &&
        alternative.rank > 0 &&
        typeof alternative.score === "number" &&
        Number.isFinite(alternative.score)
    )
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, context.limit ?? 3)
    .map(({ alternativeId, name, rank, score }) => ({
      alternativeId,
      name,
      rank,
      score,
    }));

  return { topAlternatives };
};

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
      ...(
        context === "scenario" || context?.kind === "scenario"
          ? SCENARIO_NORMALIZATION_MESSAGES
          : {}
      ),
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
    if (target === "finishedIssuePhaseResult") {
      return projectFinishedIssuePhaseResult({ result, context });
    }

    if (target === "finishedIssueScenarioPhaseResult") {
      return {
        standardizedOutput: result,
        consensusMeasure: result.consensusMeasure ?? null,
      };
    }

    if (target === "finishedIssueListSummary") {
      return projectFinishedIssueListSummary({ result, context });
    }

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
