import { isPlainObject } from "../../../../../../utils/common/objects";

const TOP_LEVEL_KEYS = Object.freeze([
  "bestCriterionId",
  "worstCriterionId",
  "bestToOthers",
  "othersToWorst",
]);

const validateMapShape = ({ comparisons, criterionIds, name }) => {
  if (!isPlainObject(comparisons)) {
    throw new Error(`BWM ${name} must be an object.`);
  }

  const keys = Object.keys(comparisons);

  if (
    keys.length !== criterionIds.length ||
    criterionIds.some((criterionId) => !Object.hasOwn(comparisons, criterionId))
  ) {
    throw new Error(`BWM ${name} must contain exactly all leaf criteria.`);
  }
};

const validateComparisonValue = ({ value, criterionId, name }) => {
  if (
    value !== "" &&
    (!Number.isInteger(value) || value < 1 || value > 9)
  ) {
    throw new Error(
      `BWM ${name} value for "${criterionId}" must be an integer from 1 to 9 or empty.`
    );
  }
};

const validateVector = ({
  selectionId,
  comparisons,
  criteria,
  name,
}) => {
  if (selectionId === "") {
    for (const criterion of criteria) {
      if (comparisons[criterion.id] !== "") {
        throw new Error(`BWM ${name} must be empty without a selection.`);
      }
    }

    return;
  }

  if (comparisons[selectionId] !== 1) {
    throw new Error(`BWM ${name} self-comparison must be 1.`);
  }
};

export const validateEvaluation = ({ criteria, evaluation }) => {
  if (!isPlainObject(evaluation)) {
    throw new Error("BWM evaluation must be an object.");
  }

  const keys = Object.keys(evaluation);
  if (
    keys.length !== TOP_LEVEL_KEYS.length ||
    TOP_LEVEL_KEYS.some((key) => !Object.hasOwn(evaluation, key))
  ) {
    throw new Error("BWM evaluation has an invalid top-level shape.");
  }

  if (
    typeof evaluation.bestCriterionId !== "string" ||
    typeof evaluation.worstCriterionId !== "string"
  ) {
    throw new Error("BWM criterion selections must be strings.");
  }

  const criterionIds = criteria.map((criterion) => criterion.id);
  const { bestCriterionId, worstCriterionId, bestToOthers, othersToWorst } =
    evaluation;

  if (
    bestCriterionId !== "" &&
    !criterionIds.includes(bestCriterionId)
  ) {
    throw new Error("BWM best criterion selection is invalid.");
  }

  if (
    worstCriterionId !== "" &&
    !criterionIds.includes(worstCriterionId)
  ) {
    throw new Error("BWM worst criterion selection is invalid.");
  }

  if (
    criteria.length > 1 &&
    bestCriterionId !== "" &&
    bestCriterionId === worstCriterionId
  ) {
    throw new Error("BWM best and worst criteria must be different.");
  }

  validateMapShape({
    comparisons: bestToOthers,
    criterionIds,
    name: "best-to-others",
  });
  validateMapShape({
    comparisons: othersToWorst,
    criterionIds,
    name: "others-to-worst",
  });

  for (const criterion of criteria) {
    validateComparisonValue({
      value: bestToOthers[criterion.id],
      criterionId: criterion.id,
      name: "best-to-others",
    });
    validateComparisonValue({
      value: othersToWorst[criterion.id],
      criterionId: criterion.id,
      name: "others-to-worst",
    });
  }

  validateVector({
    selectionId: bestCriterionId,
    comparisons: bestToOthers,
    criteria,
    name: "best-to-others",
  });
  validateVector({
    selectionId: worstCriterionId,
    comparisons: othersToWorst,
    criteria,
    name: "others-to-worst",
  });

  return evaluation;
};
