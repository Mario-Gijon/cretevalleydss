import {
  buildEmptyBestWorstCriteriaPayload,
  getBestWorstCriterionItems,
  validateBestWorstCriteriaPayload,
} from "./bestWorstCriteria.payload";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const bestWorstCriteriaAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    return buildEmptyBestWorstCriteriaPayload(
      getBestWorstCriterionItems(evaluationContext)
    );
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    if (isPlainObject(backendPayload) && Object.keys(backendPayload).length > 0) {
      return backendPayload;
    }

    return buildEmptyBestWorstCriteriaPayload(
      getBestWorstCriterionItems(evaluationContext)
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
      criterionItems: getBestWorstCriterionItems(evaluationContext),
      payload: evaluationPayload,
    });

    return message ? { valid: false, message } : { valid: true };
  },

  fromCollectivePayload() {
    return null;
  },
});
