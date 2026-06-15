import {
  buildEmptyBestWorstCriteriaPayload,
  validateBestWorstCriteriaPayload,
} from "./bestWorstCriteria.payload";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const resolveCriterionNames = (evaluationViewContext) =>
  evaluationViewContext?.criteria?.leafNames || [];

export const bestWorstCriteriaAdapter = Object.freeze({
  buildEmptyPayload({ evaluationViewContext }) {
    return buildEmptyBestWorstCriteriaPayload(
      resolveCriterionNames(evaluationViewContext)
    );
  },

  fromBackendPayload({ backendPayload, evaluationViewContext }) {
    if (isPlainObject(backendPayload) && Object.keys(backendPayload).length > 0) {
      return backendPayload;
    }

    return buildEmptyBestWorstCriteriaPayload(
      resolveCriterionNames(evaluationViewContext)
    );
  },

  toBackendPayload({ viewPayload }) {
    return isPlainObject(viewPayload) ? viewPayload : {};
  },

  clearViewPayload({ evaluationViewContext }) {
    return buildEmptyBestWorstCriteriaPayload(
      resolveCriterionNames(evaluationViewContext)
    );
  },

  validateDraft() {
    return null;
  },

  validateSubmit({ viewPayload, evaluationViewContext }) {
    return validateBestWorstCriteriaPayload({
      criterionNames: resolveCriterionNames(evaluationViewContext),
      payload: viewPayload,
    });
  },

  resolveCollectivePayload() {
    return null;
  },
});
