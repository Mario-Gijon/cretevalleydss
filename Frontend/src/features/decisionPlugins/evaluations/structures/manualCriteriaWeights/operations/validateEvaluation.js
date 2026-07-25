import { isPlainObject } from "../../../../../../utils/common/objects";

const TOP_LEVEL_KEYS = Object.freeze(["weightsByCriterion"]);

const validateWeight = ({ value, criterionId }) => {
  if (value === "") {
    return;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `Manual weight for "${criterionId}" must be a finite number between 0 and 1 or empty.`
    );
  }
};

export const validateEvaluation = ({ criteria, evaluation }) => {
  if (!isPlainObject(evaluation)) {
    throw new Error("Manual-weight evaluation must be an object.");
  }

  const evaluationKeys = Object.keys(evaluation);
  if (
    evaluationKeys.length !== TOP_LEVEL_KEYS.length ||
    TOP_LEVEL_KEYS.some((key) => !Object.hasOwn(evaluation, key))
  ) {
    throw new Error(
      "Manual-weight evaluation must contain only weightsByCriterion."
    );
  }

  const weightsByCriterion = evaluation.weightsByCriterion;
  if (!isPlainObject(weightsByCriterion)) {
    throw new Error("Manual-weight weightsByCriterion must be an object.");
  }

  const criterionIds = criteria.map((criterion) => criterion.id);
  const weightKeys = Object.keys(weightsByCriterion);
  if (
    weightKeys.length !== criterionIds.length ||
    criterionIds.some((criterionId) => !Object.hasOwn(weightsByCriterion, criterionId))
  ) {
    throw new Error(
      "Manual-weight weightsByCriterion must contain exactly all leaf criteria."
    );
  }

  for (const criterionId of criterionIds) {
    validateWeight({
      value: weightsByCriterion[criterionId],
      criterionId,
    });
  }

  return evaluation;
};
