import {
  EVALUATION_STAGES,
} from "../../evaluationStages.js";
import {
  buildExpectedPairsByCriterion,
} from "./alternativePairwiseByCriterion.context.js";
import { validateCompletedPairwiseEvaluationPayloadsOrThrow } from "./alternativePairwiseByCriterion.computeValidation.js";
import { buildGetPayload } from "./alternativePairwiseByCriterion.getPayload.js";
import {
  normalizePayloadOrThrow,
  resolveRequireValueFromModeOrThrow,
} from "./alternativePairwiseByCriterion.payload.js";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  async get({ storedEvaluation, structureContext }) {
    const { payload } = await buildGetPayload({
      storedEvaluation,
      structureContext,
    });
    return payload;
  },

  async save({ mode, payload, structureContext }) {
    const requireValue = resolveRequireValueFromModeOrThrow(mode);

    return normalizePayloadOrThrow({
      payload,
      structureContext,
      requireValue,
    });
  },

  async validateBeforeCompute({
    evaluations,
    alternativeNames,
    criteria,
    criterionNames,
  }) {
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
