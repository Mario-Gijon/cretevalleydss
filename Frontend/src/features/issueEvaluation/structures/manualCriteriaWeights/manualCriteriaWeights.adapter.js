const resolveCriterionNames = (evaluationContext) =>
  evaluationContext?.criteria?.leafNames || [];

const buildEmptyWeightsByCriterion = (criterionNames) =>
  Object.fromEntries(criterionNames.map((name) => [name, ""]));

const normalizeDraftWeights = (criterionNames, raw = {}) => {
  const normalized = {};

  for (const name of criterionNames) {
    const value = raw?.[name];
    if (value === "" || value === null || value === undefined) {
      normalized[name] = "";
      continue;
    }

    const numeric = Number(value);
    normalized[name] = Number.isFinite(numeric) ? numeric : "";
  }

  return normalized;
};

const sumWeights = (criterionNames, valuesByCriterion) =>
  criterionNames.reduce(
    (sum, name) => sum + Number(valuesByCriterion[name] ?? 0),
    0
  );

export const manualCriteriaWeightsAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    const criterionNames = resolveCriterionNames(evaluationContext);
    return { weightsByCriterion: buildEmptyWeightsByCriterion(criterionNames) };
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    const criterionNames = resolveCriterionNames(evaluationContext);
    return {
      weightsByCriterion: normalizeDraftWeights(
        criterionNames,
        backendPayload?.weightsByCriterion || {}
      ),
    };
  },

  toBackendPayload({ evaluationPayload }) {
    return {
      weightsByCriterion:
        evaluationPayload?.weightsByCriterion &&
        typeof evaluationPayload.weightsByCriterion === "object" &&
        !Array.isArray(evaluationPayload.weightsByCriterion)
          ? evaluationPayload.weightsByCriterion
          : {},
    };
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    if (mode === "draft") {
      return { valid: true };
    }

    const criterionNames = resolveCriterionNames(evaluationContext);
    const weightsByCriterion = evaluationPayload?.weightsByCriterion || {};

    for (const name of criterionNames) {
      const value = weightsByCriterion[name];
      if (value === "" || value === null || value === undefined) {
        return { valid: false, message: `Criterion '${name}' is required.` };
      }

      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return { valid: false, message: `Criterion '${name}' must be numeric.` };
      }

      if (numeric < 0 || numeric > 1) {
        return {
          valid: false,
          message: `Criterion '${name}' must be between 0 and 1.`,
        };
      }
    }

    const total = sumWeights(criterionNames, weightsByCriterion);
    if (Math.abs(total - 1) > 0.001) {
      return { valid: false, message: "Weights must sum to 1." };
    }

    return { valid: true };
  },

  fromCollectivePayload() {
    return null;
  },
});
