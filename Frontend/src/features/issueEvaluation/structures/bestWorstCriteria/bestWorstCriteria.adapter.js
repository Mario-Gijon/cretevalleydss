import {
  buildEmptyBestWorstCriteriaPayload,
  validateBestWorstCriteriaPayload,
} from "./bestWorstCriteria.payload";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const bestWorstCriteriaAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    return buildEmptyBestWorstCriteriaPayload(
      evaluationContext.criteria.leafNames
    );
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    if (isPlainObject(backendPayload) && Object.keys(backendPayload).length > 0) {
      return backendPayload;
    }

    return buildEmptyBestWorstCriteriaPayload(
      evaluationContext.criteria.leafNames
    );
  },

  toBackendPayload({ evaluationPayload }) {
    return evaluationPayload;
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    if (mode === "draft") {
      return { valid: true };
    }

    const message = validateBestWorstCriteriaPayload({
      criterionNames: evaluationContext.criteria.leafNames,
      payload: evaluationPayload,
    });

    return message ? { valid: false, message } : { valid: true };
  },

  fromCollectivePayload() {
    return null;
  },
});
