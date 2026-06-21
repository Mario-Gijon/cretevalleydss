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
  async get({ payload: storedPayload, evaluationContext }) {
    const { payload } = await buildGetPayload({
      payload: storedPayload,
      evaluationContext,
    });
    return payload;
  },

  async save({ mode, payload, evaluationContext }) {
    const requireValue = resolveRequireValueFromModeOrThrow(mode);

    return normalizePayloadOrThrow({
      payload,
      evaluationContext,
      requireValue,
    });
  },

  async validateBeforeCompute({
    evaluations,
    alternatives,
    criteria,
  }) {
    const expectedPairsByCriterion = buildExpectedPairsByCriterion({
      criteria,
      alternatives,
    });

    validateCompletedPairwiseEvaluationPayloadsOrThrow({
      evaluations,
      criteria,
      expectedPairsByCriterion,
    });
  },
});
