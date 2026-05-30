import { createInternalError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";

export const normalizeScenarioExecutionResultOrThrow = ({ result }) => {
  if (result === null || result === undefined) {
    throw createInternalError("Scenario model execution result is required", {
      field: "result",
    });
  }

  if (!Array.isArray(result?.rankedAlternatives) || result.rankedAlternatives.length === 0) {
    throw createInternalError(
      "Scenario model execution result.rankedAlternatives must be a non-empty array",
      {
        field: "result.rankedAlternatives",
      }
    );
  }

  for (const [index, entry] of result.rankedAlternatives.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw createInternalError("Invalid rankedAlternatives entry", {
        field: `result.rankedAlternatives[${index}]`,
      });
    }

    if (typeof entry.name !== "string" || !entry.name.trim()) {
      throw createInternalError("rankedAlternatives entry requires name", {
        field: `result.rankedAlternatives[${index}].name`,
      });
    }

    if (!Number.isFinite(Number(entry.score))) {
      throw createInternalError("rankedAlternatives entry requires finite score", {
        field: `result.rankedAlternatives[${index}].score`,
      });
    }

    if (!Number.isInteger(Number(entry.rank)) || Number(entry.rank) <= 0) {
      throw createInternalError("rankedAlternatives entry requires positive rank", {
        field: `result.rankedAlternatives[${index}].rank`,
      });
    }
  }

  if (!isPlainObject(result.collectiveEvaluations)) {
    throw createInternalError(
      "Scenario model execution result.collectiveEvaluations is required",
      {
        field: "result.collectiveEvaluations",
      }
    );
  }

  if (!isPlainObject(result.plotsGraphic)) {
    throw createInternalError("Scenario model execution result.plotsGraphic is required", {
      field: "result.plotsGraphic",
    });
  }

  if (
    result.consensusMeasure !== null &&
    !Number.isFinite(result.consensusMeasure)
  ) {
    throw createInternalError(
      "Scenario model execution result.consensusMeasure must be finite or null",
      {
        field: "result.consensusMeasure",
      }
    );
  }

  if (!isPlainObject(result.rawOutput)) {
    throw createInternalError("Scenario model execution result.rawOutput is required", {
      field: "result.rawOutput",
    });
  }

  return {
    standardResult: {
      rankedAlternatives: result.rankedAlternatives,
      collectiveEvaluations: result.collectiveEvaluations,
      plotsGraphic: result.plotsGraphic,
      consensusMeasure: result.consensusMeasure,
      consensusLifecycle: result.consensusLifecycle ?? null,
      rawOutput: result.rawOutput,
    },
    rawOutput: result.rawOutput,
  };
};
