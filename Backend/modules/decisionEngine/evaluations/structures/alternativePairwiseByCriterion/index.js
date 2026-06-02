import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import { getOrderedAlternativeAndCriterionNames } from "../shared/alternativeEvaluation.helpers.js";
import {
  buildExpectedPairsByCriterion,
} from "./alternativePairwiseByCriterion.context.js";
import { validateCompletedPairwiseEvaluationPayloadsOrThrow } from "./alternativePairwiseByCriterion.computeValidation.js";
import {
  buildDisplayMeta,
  buildProgressMeta,
} from "./alternativePairwiseByCriterion.display.js";
import { buildGetPayload } from "./alternativePairwiseByCriterion.getPayload.js";
import {
  normalizePayloadOrThrow,
  resolveRequireValueFromModeOrThrow,
} from "./alternativePairwiseByCriterion.payload.js";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  async get({
    storedEvaluation,
    structureContext,
    includeMeta = false,
  }) {
    const { payload, context } = await buildGetPayload({
      storedEvaluation,
      structureContext,
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
          criterionNames: context.criterionNames,
        }).progress,
        display: buildDisplayMeta({
          alternativeNames: context.alternativeNames,
          criterionNames: context.criterionNames,
          storedEvaluation,
          collectiveEvaluations: structureContext?.collectiveEvaluations ?? null,
        }),
      },
    };
  },

  async save({ mode, payload, structureContext }) {
    const requireValue = resolveRequireValueFromModeOrThrow(mode);

    return normalizePayloadOrThrow({
      payload,
      structureContext,
      requireValue,
    });
  },

  async validateBeforeCompute({ evaluations, issue }) {
    const { alternativeNames, criteria, criterionNames } =
      await getOrderedAlternativeAndCriterionNames({ issue });
    const expectedPairsByCriterion = buildExpectedPairsByCriterion({
      criteria,
      alternativeNames,
    });

    validateCompletedPairwiseEvaluationPayloadsOrThrow({
      evaluations,
      criterionNames,
      expectedPairsByCriterion,
    });
  },
});
