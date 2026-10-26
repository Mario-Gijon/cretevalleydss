import { resolveCriteria } from "./resolveCriteria";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasValidWeightVector = ({ criteria, weightsByCriterion }) => {
  if (!isPlainObject(weightsByCriterion)) return false;
  const ids = criteria.map((criterion) => criterion.id);
  if (
    Object.keys(weightsByCriterion).length !== ids.length ||
    ids.some((id) => !Object.hasOwn(weightsByCriterion, id))
  ) {
    return false;
  }
  let total = 0;
  for (const id of ids) {
    const value = weightsByCriterion[id];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return false;
    }
    total += value;
  }
  return Math.abs(total - 1) <= 1e-6;
};

export const resolveCollective = ({ criteria, collectiveEvaluation }) => {
  if (collectiveEvaluation === null || collectiveEvaluation === undefined) return null;
  if (!isPlainObject(collectiveEvaluation)) {
    throw new Error("AHP collective result must be an object.");
  }
  if (!hasValidWeightVector({ criteria, weightsByCriterion: collectiveEvaluation.weightsByCriterion })) {
    throw new Error("AHP collective result must contain normalized weights for every criterion.");
  }
  const diagnostics = collectiveEvaluation.expertDiagnosticsByExpert;
  if (diagnostics !== undefined && !isPlainObject(diagnostics)) {
    throw new Error("AHP expert consistency diagnostics must be an object.");
  }
  const expertWeights = collectiveEvaluation.expertWeightsByExpert;
  if (expertWeights !== undefined && !isPlainObject(expertWeights)) {
    throw new Error("AHP individual criterion weights must be an object.");
  }
  if (
    expertWeights !== undefined &&
    Object.values(expertWeights).some(
      (weightsByCriterion) =>
        !hasValidWeightVector({ criteria, weightsByCriterion })
    )
  ) {
    throw new Error("AHP individual priorities must contain normalized weights for every criterion.");
  }
  return collectiveEvaluation;
};

export const isCollectiveEvaluationUsable = ({
  decisionContext,
  collectiveEvaluation,
}) => {
  try {
    const criteria = resolveCriteria({ decisionContext });
    return Boolean(resolveCollective({ criteria, collectiveEvaluation }));
  } catch {
    return false;
  }
};
