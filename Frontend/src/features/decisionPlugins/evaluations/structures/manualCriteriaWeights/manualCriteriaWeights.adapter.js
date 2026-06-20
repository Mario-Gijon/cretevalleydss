const buildEmptyWeightsByCriterion = (criteria) =>
  Object.fromEntries(criteria.map((criterion) => [criterion.id, ""]));

const normalizeDraftWeights = (criteria, raw = {}) => {
  const normalized = {};

  for (const criterion of criteria) {
    const value = raw?.[criterion.id];
    if (value === "" || value === null || value === undefined) {
      normalized[criterion.id] = "";
      continue;
    }

    const numeric = Number(value);
    normalized[criterion.id] = Number.isFinite(numeric) ? numeric : "";
  }

  return normalized;
};

const sumWeights = (criteria, valuesByCriterion) =>
  criteria.reduce(
    (sum, criterion) => sum + Number(valuesByCriterion[criterion.id] ?? 0),
    0
  );

const getCriteria = (evaluationContext) =>
  Array.isArray(evaluationContext?.criteria?.leafItems)
    ? evaluationContext.criteria.leafItems
        .map((criterion) => ({
          id: criterion?.id,
          name: criterion?.name,
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];

export const manualCriteriaWeightsAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    const criteria = getCriteria(evaluationContext);
    return { weightsByCriterion: buildEmptyWeightsByCriterion(criteria) };
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    const criteria = getCriteria(evaluationContext);
    return {
      weightsByCriterion: normalizeDraftWeights(
        criteria,
        backendPayload?.weightsByCriterion || {}
      ),
    };
  },

  toBackendPayload({ evaluationPayload }) {
    return {
      weightsByCriterion: evaluationPayload.weightsByCriterion,
    };
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    if (mode === "draft") {
      return { valid: true };
    }

    const criteria = getCriteria(evaluationContext);
    const weightsByCriterion = evaluationPayload.weightsByCriterion;

    for (const criterion of criteria) {
      const value = weightsByCriterion[criterion.id];
      if (value === "" || value === null || value === undefined) {
        return { valid: false, message: `Criterion '${criterion.name}' is required.` };
      }

      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return {
          valid: false,
          message: `Criterion '${criterion.name}' must be numeric.`,
        };
      }

      if (numeric < 0 || numeric > 1) {
        return {
          valid: false,
          message: `Criterion '${criterion.name}' must be between 0 and 1.`,
        };
      }
    }

    const total = sumWeights(criteria, weightsByCriterion);
    if (Math.abs(total - 1) > 0.001) {
      return { valid: false, message: "Weights must sum to 1." };
    }

    return { valid: true };
  },

  fromCollectivePayload() {
    return null;
  },
});
