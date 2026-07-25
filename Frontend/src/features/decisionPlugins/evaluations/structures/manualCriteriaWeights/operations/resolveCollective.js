import { isPlainObject } from "../../../../../../utils/common/objects";

const WEIGHT_SUM_TOLERANCE = 0.001;

export const resolveCollective = ({ criteria, collectiveEvaluation }) => {
  if (collectiveEvaluation === null || collectiveEvaluation === undefined) {
    return null;
  }

  if (!isPlainObject(collectiveEvaluation)) {
    throw new Error("Manual-weight collective evaluation must be an object.");
  }

  if (
    Object.keys(collectiveEvaluation).length !== 1 ||
    !Object.hasOwn(collectiveEvaluation, "weightsByCriterion")
  ) {
    throw new Error(
      "Manual-weight collective evaluation must contain only weightsByCriterion."
    );
  }

  const weightsByCriterion = collectiveEvaluation.weightsByCriterion;
  if (!isPlainObject(weightsByCriterion)) {
    throw new Error("Manual-weight collective weights must be an object.");
  }

  const criterionIds = criteria.map((criterion) => criterion.id);
  if (
    Object.keys(weightsByCriterion).length !== criterionIds.length ||
    criterionIds.some((criterionId) => !Object.hasOwn(weightsByCriterion, criterionId))
  ) {
    throw new Error(
      "Manual-weight collective weights must contain exactly all leaf criteria."
    );
  }

  const total = criterionIds.reduce((sum, criterionId) => {
    const weight = weightsByCriterion[criterionId];
    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight < 0 ||
      weight > 1
    ) {
      throw new Error(
        "Manual-weight collective weights must be finite numbers between 0 and 1."
      );
    }

    return sum + weight;
  }, 0);

  if (Math.abs(total - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new Error("Manual-weight collective weights must sum to 1.");
  }

  return collectiveEvaluation;
};
