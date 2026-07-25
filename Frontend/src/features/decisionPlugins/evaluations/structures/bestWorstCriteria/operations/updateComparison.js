import { isPlainObject } from "../../../../../../utils/common/objects";

const COMPARISON_CONFIG = Object.freeze({
  bestToOthers: "bestCriterionId",
  othersToWorst: "worstCriterionId",
});

const normalizeComparisonInput = (value) => {
  if (value === "") {
    return "";
  }

  const normalizedValue =
    typeof value === "string" && /^[1-9]$/.test(value)
      ? Number(value)
      : value;

  return Number.isInteger(normalizedValue) &&
    normalizedValue >= 1 &&
    normalizedValue <= 9
    ? normalizedValue
    : null;
};

export const updateComparison = ({
  evaluation,
  criteria,
  comparison,
  criterionId,
  value,
}) => {
  if (!isPlainObject(evaluation)) {
    throw new Error("BWM evaluation state must be an object.");
  }

  const selectionKey = COMPARISON_CONFIG[comparison];
  if (!selectionKey) {
    throw new Error("BWM comparison kind is invalid.");
  }

  const criterionIds = criteria.map((criterion) => criterion.id);
  const selectedCriterionId = evaluation[selectionKey];

  if (!criterionIds.includes(selectedCriterionId)) {
    throw new Error("BWM comparison requires a valid selected criterion.");
  }

  if (!criterionIds.includes(criterionId)) {
    throw new Error("BWM comparison references an unknown criterion.");
  }

  if (criterionId === selectedCriterionId) {
    throw new Error("BWM self-comparisons cannot be edited.");
  }

  const normalizedValue = normalizeComparisonInput(value);
  if (normalizedValue === null) {
    return evaluation;
  }

  const nextEvaluation = structuredClone(evaluation);
  nextEvaluation[comparison][criterionId] = normalizedValue;

  return nextEvaluation;
};
