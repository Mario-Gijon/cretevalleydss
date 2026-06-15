import { createInternalError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

const isFiniteOrNull = (value) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const DEFAULT_MESSAGES = {
  resultRequired: "Model execution result is required",
  resultMustBeObject: "Model execution result must be an object",
  rankedAlternativesRequired:
    "Model execution result.rankedAlternatives must be a non-empty array",
  rankedAlternativeInvalidEntry: "Each ranked alternative must be an object",
  rankedAlternativeNameRequired: "Each ranked alternative requires a name",
  rankedAlternativeAlternativeIdInvalid:
    "Each ranked alternative alternativeId must be a string or null",
  rankedAlternativeScoreRequired:
    "Each ranked alternative requires a finite score",
  rankedAlternativeRankRequired:
    "Each ranked alternative requires a positive integer rank",
  rankedAlternativesRankOrderInvalid:
    "rankedAlternatives must be ordered from best to worst by rank",
  collectiveEvaluationsRequired:
    "Model execution result.collectiveEvaluations is required",
  plotsGraphicRequired:
    "Model execution result.plotsGraphic must be an object",
  consensusMeasureInvalid:
    "Model execution result.consensusMeasure must be finite or null",
  rawOutputRequired: "Model execution result.rawOutput is required",
};

export const normalizeModelExecutionResult = ({
  result,
  messages = {},
  options = {},
}) => {
  const resolvedMessages = { ...DEFAULT_MESSAGES, ...messages };
  const {
    requireResultObject = true,
    requireResultPresenceCheck = !requireResultObject,
    validateAlternativeIdType = true,
    enforceRankOrdering = true,
  } = options;

  const throwInvalid = (message, field) => {
    throw createInternalError(message, {
      field,
    });
  };

  if (requireResultPresenceCheck && (result === null || result === undefined)) {
    throwInvalid(resolvedMessages.resultRequired, "result");
  }

  if (requireResultObject && !isPlainObject(result)) {
    throwInvalid(resolvedMessages.resultMustBeObject, "result");
  }

  if (
    !Array.isArray(result?.rankedAlternatives) ||
    result.rankedAlternatives.length === 0
  ) {
    throwInvalid(
      resolvedMessages.rankedAlternativesRequired,
      "result.rankedAlternatives"
    );
  }

  let previousRank = 0;
  result.rankedAlternatives.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      throwInvalid(
        resolvedMessages.rankedAlternativeInvalidEntry,
        `result.rankedAlternatives[${index}]`
      );
    }

    const name = normalizeNonEmptyString(entry.name);
    if (!name) {
      throwInvalid(
        resolvedMessages.rankedAlternativeNameRequired,
        `result.rankedAlternatives[${index}].name`
      );
    }

    if (
      validateAlternativeIdType &&
      typeof entry.alternativeId !== "string" &&
      entry.alternativeId !== null
    ) {
      throwInvalid(
        resolvedMessages.rankedAlternativeAlternativeIdInvalid,
        `result.rankedAlternatives[${index}].alternativeId`
      );
    }

    const score = Number(entry.score);
    if (!Number.isFinite(score)) {
      throwInvalid(
        resolvedMessages.rankedAlternativeScoreRequired,
        `result.rankedAlternatives[${index}].score`
      );
    }

    const rank = Number(entry.rank);
    if (!Number.isInteger(rank) || rank <= 0) {
      throwInvalid(
        resolvedMessages.rankedAlternativeRankRequired,
        `result.rankedAlternatives[${index}].rank`
      );
    }

    if (enforceRankOrdering && rank <= previousRank) {
      throwInvalid(
        resolvedMessages.rankedAlternativesRankOrderInvalid,
        "result.rankedAlternatives"
      );
    }
    previousRank = rank;
  });

  if (!isPlainObject(result.collectiveEvaluations)) {
    throwInvalid(
      resolvedMessages.collectiveEvaluationsRequired,
      "result.collectiveEvaluations"
    );
  }

  if (!isPlainObject(result.plotsGraphic)) {
    throwInvalid(resolvedMessages.plotsGraphicRequired, "result.plotsGraphic");
  }

  if (!isFiniteOrNull(result.consensusMeasure)) {
    throwInvalid(
      resolvedMessages.consensusMeasureInvalid,
      "result.consensusMeasure"
    );
  }

  if (!isPlainObject(result.rawOutput)) {
    throwInvalid(resolvedMessages.rawOutputRequired, "result.rawOutput");
  }

  return {
    rankedAlternatives: result.rankedAlternatives,
    collectiveEvaluations: result.collectiveEvaluations,
    plotsGraphic: result.plotsGraphic,
    consensusMeasure: result.consensusMeasure,
    consensusLifecycle: result.consensusLifecycle ?? null,
    rawOutput: result.rawOutput,
  };
};
