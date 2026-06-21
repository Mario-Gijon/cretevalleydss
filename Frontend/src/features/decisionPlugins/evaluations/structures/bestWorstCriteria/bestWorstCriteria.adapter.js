import {
  buildEmptyBestWorstCriteriaPayload,
  validateBestWorstCriteriaPayload,
} from "./bestWorstCriteria.payload";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getCriterionNames = (evaluationContext) =>
  Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => criterion?.name)
        .filter(Boolean)
    : [];

export const bestWorstCriteriaAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    return buildEmptyBestWorstCriteriaPayload(getCriterionNames(evaluationContext));
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    if (isPlainObject(backendPayload) && Object.keys(backendPayload).length > 0) {
      return backendPayload;
    }

    return buildEmptyBestWorstCriteriaPayload(getCriterionNames(evaluationContext));
  },

  toBackendPayload({ evaluationPayload }) {
    return evaluationPayload;
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    if (mode === "draft") {
      return { valid: true };
    }

    const message = validateBestWorstCriteriaPayload({
      criterionNames: getCriterionNames(evaluationContext),
      payload: evaluationPayload,
    });

    return message ? { valid: false, message } : { valid: true };
  },

  fromCollectivePayload() {
    return null;
  },
});
