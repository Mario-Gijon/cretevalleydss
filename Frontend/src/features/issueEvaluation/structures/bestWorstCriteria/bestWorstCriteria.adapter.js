import {
  buildEmptyBestWorstCriteriaPayload,
  validateBestWorstCriteriaPayload,
} from "./bestWorstCriteria.payload";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const resolveCriterionNames = (evaluationContext) =>
  evaluationContext?.criteria?.leafNames || [];

export const bestWorstCriteriaAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    return buildEmptyBestWorstCriteriaPayload(
      resolveCriterionNames(evaluationContext)
    );
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    if (isPlainObject(backendPayload) && Object.keys(backendPayload).length > 0) {
      return backendPayload;
    }

    return buildEmptyBestWorstCriteriaPayload(
      resolveCriterionNames(evaluationContext)
    );
  },

  toBackendPayload({ evaluationPayload }) {
    return isPlainObject(evaluationPayload) ? evaluationPayload : {};
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    if (mode === "draft") {
      return { valid: true };
    }

    const message = validateBestWorstCriteriaPayload({
      criterionNames: resolveCriterionNames(evaluationContext),
      payload: evaluationPayload,
    });

    return message ? { valid: false, message } : { valid: true };
  },

  fromCollectivePayload() {
    return null;
  },
});
