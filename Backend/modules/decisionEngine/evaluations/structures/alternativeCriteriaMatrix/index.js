import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import { buildDisplayMeta, buildProgressMeta } from "./alternativeCriteriaMatrix.display.js";
import { buildGetPayload } from "./alternativeCriteriaMatrix.getPayload.js";
import {
  normalizePayloadOrThrow,
  resolveRequireValueFromModeOrThrow,
} from "./alternativeCriteriaMatrix.payload.js";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  async get({
    storedEvaluation,
    issue,
    alternatives,
    criteria,
    collectiveEvaluations = null,
    includeMeta = false,
  }) {
    const { payload, context } = await buildGetPayload({
      storedEvaluation,
      issue,
      alternatives,
      criteria,
    });

    if (!includeMeta) {
      return payload;
    }

    return {
      ...payload,
      meta: {
        progress: buildProgressMeta({
          storedEvaluation,
          alternativeNames: context.alternativeNames,
          criteria: context.criteria,
        }).progress,
        display: buildDisplayMeta({
          alternativeNames: context.alternativeNames,
          criteria: context.criteria,
          storedEvaluation,
          collectiveEvaluations,
        }),
      },
    };
  },

  async save({ payload, issue, mode, alternatives, criteria }) {
    const requireValue = resolveRequireValueFromModeOrThrow(mode);

    return normalizePayloadOrThrow({
      payload,
      issue,
      requireValue,
      alternatives,
      criteria,
    });
  },
});
