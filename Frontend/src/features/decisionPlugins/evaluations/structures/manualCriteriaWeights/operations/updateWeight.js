import { validateEvaluation } from "./validateEvaluation";

const normalizeWeightInput = (rawValue) => {
  if (rawValue === "") {
    return "";
  }

  const normalizedValue =
    typeof rawValue === "string" &&
    /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(rawValue.trim())
      ? Number.parseFloat(rawValue)
      : rawValue;

  return typeof normalizedValue === "number" &&
    Number.isFinite(normalizedValue) &&
    normalizedValue >= 0 &&
    normalizedValue <= 1
    ? normalizedValue
    : null;
};

export const updateWeight = ({
  evaluation,
  criteria,
  criterionId,
  rawValue,
}) => {
  validateEvaluation({ criteria, evaluation });

  if (!criteria.some((criterion) => criterion.id === criterionId)) {
    throw new Error("Manual-weight update references an unknown criterion.");
  }

  const normalizedValue = normalizeWeightInput(rawValue);
  if (normalizedValue === null) {
    return evaluation;
  }

  const nextEvaluation = structuredClone(evaluation);
  nextEvaluation.weightsByCriterion[criterionId] = normalizedValue;

  return nextEvaluation;
};
