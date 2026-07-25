import { isPlainObject } from "../../../../../../utils/common/objects";

const WEIGHT_TOTAL_TOLERANCE = 1e-6;

export const resolveCollective = ({ criteria, collectiveEvaluation }) => {
  if (collectiveEvaluation === null || collectiveEvaluation === undefined) {
    return null;
  }

  if (!isPlainObject(collectiveEvaluation)) {
    throw new Error("BWM collective evaluation must be an object.");
  }

  if (
    Object.keys(collectiveEvaluation).length !== 1 ||
    !Object.hasOwn(collectiveEvaluation, "weightsByCriterion")
  ) {
    throw new Error(
      "BWM collective evaluation must contain only weightsByCriterion."
    );
  }

  const weightsByCriterion = collectiveEvaluation.weightsByCriterion;
  if (!isPlainObject(weightsByCriterion)) {
    throw new Error("BWM collective criterion weights must be an object.");
  }

  const criterionIds = criteria.map((criterion) => criterion.id);
  const weightKeys = Object.keys(weightsByCriterion);

  if (
    weightKeys.length !== criterionIds.length ||
    criterionIds.some(
      (criterionId) => !Object.hasOwn(weightsByCriterion, criterionId)
    )
  ) {
    throw new Error(
      "BWM collective weights must contain exactly all leaf criteria."
    );
  }

  let total = 0;
  for (const criterionId of criterionIds) {
    const weight = weightsByCriterion[criterionId];
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
      throw new Error("BWM collective weights must be finite and non-negative.");
    }

    total += weight;
  }

  if (Math.abs(total - 1) > WEIGHT_TOTAL_TOLERANCE) {
    throw new Error("BWM collective criterion weights must sum to 1.");
  }

  return collectiveEvaluation;
};
