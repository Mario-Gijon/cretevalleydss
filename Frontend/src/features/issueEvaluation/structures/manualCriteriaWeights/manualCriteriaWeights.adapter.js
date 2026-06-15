const resolveCriterionNames = (evaluationViewContext) =>
  evaluationViewContext?.criteria?.leafNames || [];

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
  criterionNames.reduce((sum, name) => sum + Number(valuesByCriterion[name] ?? 0), 0);

export const manualCriteriaWeightsAdapter = Object.freeze({
  buildEmptyPayload({ evaluationViewContext }) {
    const criterionNames = resolveCriterionNames(evaluationViewContext);
    return { weightsByCriterion: buildEmptyWeightsByCriterion(criterionNames) };
  },

  fromBackendPayload({ backendPayload, evaluationViewContext }) {
    const criterionNames = resolveCriterionNames(evaluationViewContext);
    return {
      weightsByCriterion: normalizeDraftWeights(
        criterionNames,
        backendPayload?.weightsByCriterion || {}
      ),
    };
  },

  toBackendPayload({ viewPayload }) {
    return {
      weightsByCriterion:
        viewPayload?.weightsByCriterion &&
        typeof viewPayload.weightsByCriterion === "object" &&
        !Array.isArray(viewPayload.weightsByCriterion)
          ? viewPayload.weightsByCriterion
          : {},
    };
  },

  clearViewPayload({ evaluationViewContext }) {
    const criterionNames = resolveCriterionNames(evaluationViewContext);
    return { weightsByCriterion: buildEmptyWeightsByCriterion(criterionNames) };
  },

  validateDraft() {
    return null;
  },

  validateSubmit({ viewPayload, evaluationViewContext }) {
    const criterionNames = resolveCriterionNames(evaluationViewContext);
    const weightsByCriterion = viewPayload?.weightsByCriterion || {};

    for (const name of criterionNames) {
      const value = weightsByCriterion[name];
      if (value === "" || value === null || value === undefined) {
        return `Criterion '${name}' is required.`;
      }

      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return `Criterion '${name}' must be numeric.`;
      }

      if (numeric < 0 || numeric > 1) {
        return `Criterion '${name}' must be between 0 and 1.`;
      }
    }

    const total = sumWeights(criterionNames, weightsByCriterion);
    if (Math.abs(total - 1) > 0.001) {
      return "Weights must sum to 1.";
    }

    return null;
  },

  resolveCollectivePayload() {
    return null;
  },
});
