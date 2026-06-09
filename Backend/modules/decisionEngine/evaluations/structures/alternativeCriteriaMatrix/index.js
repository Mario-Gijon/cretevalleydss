import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import { resolveAlternativesAndCriteria } from "./alternativeCriteriaMatrix.context.js";
import { buildGetPayload } from "./alternativeCriteriaMatrix.getPayload.js";
import { buildProgressMeta } from "./alternativeCriteriaMatrix.progress.js";
import {
  normalizePayloadOrThrow,
  resolveRequireValueFromModeOrThrow,
} from "./alternativeCriteriaMatrix.payload.js";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  async get({ storedEvaluation, structureContext }) {
    const { payload } = await buildGetPayload({
      storedEvaluation,
      structureContext,
    });
    return payload;
  },

  async getProgress({ storedEvaluation, structureContext }) {
    const { alternativeNames, criteria } = await resolveAlternativesAndCriteria({
      structureContext,
    });

    return buildProgressMeta({
      storedEvaluation,
      alternativeNames,
      criteria,
    }).progress;
  },

  async save({ mode, payload, structureContext }) {
    const requireValue = resolveRequireValueFromModeOrThrow(mode);

    return normalizePayloadOrThrow({
      payload,
      structureContext,
      requireValue,
    });
  },
});
