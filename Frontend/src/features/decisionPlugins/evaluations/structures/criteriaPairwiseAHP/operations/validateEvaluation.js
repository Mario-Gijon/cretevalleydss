import { resolveCriteria } from "./resolveCriteria";
import { SAATY_SCALE_VALUES } from "./saatyPreference";

export const MAX_AHP_CRITERIA = 15;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isSaatyValue = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  SAATY_SCALE_VALUES.some((allowed) => Math.abs(value - allowed) <= 1e-12);

export const validateEvaluation = ({ decisionContext, evaluation }) => {
  const criteria = resolveCriteria({ decisionContext });
  if (criteria.length === 0) {
    throw new Error("AHP requires at least one criterion.");
  }
  if (criteria.length > MAX_AHP_CRITERIA) {
    throw new Error(
      `AHP consistency diagnostics support at most ${MAX_AHP_CRITERIA} criteria.`
    );
  }
  if (!isPlainObject(evaluation)) {
    throw new Error("AHP evaluation must be an object.");
  }
  if (
    Object.keys(evaluation).length !== 1 ||
    !Object.hasOwn(evaluation, "comparisons") ||
    !Array.isArray(evaluation.comparisons)
  ) {
    throw new Error("AHP evaluation must contain exactly a comparisons array.");
  }

  const ids = new Set(criteria.map((criterion) => criterion.id));
  const seenPairs = new Set();
  const comparisons = evaluation.comparisons.map((comparison, index) => {
    if (
      !isPlainObject(comparison) ||
      Object.keys(comparison).length !== 3 ||
      !Object.hasOwn(comparison, "criterionId") ||
      !Object.hasOwn(comparison, "comparedCriterionId") ||
      !Object.hasOwn(comparison, "value")
    ) {
      throw new Error(`AHP comparison ${index + 1} has an invalid shape.`);
    }
    const criterionId = typeof comparison.criterionId === "string" ? comparison.criterionId.trim() : "";
    const comparedCriterionId = typeof comparison.comparedCriterionId === "string" ? comparison.comparedCriterionId.trim() : "";
    if (!ids.has(criterionId) || !ids.has(comparedCriterionId)) {
      throw new Error(`AHP comparison ${index + 1} references an unknown criterion.`);
    }
    if (criterionId === comparedCriterionId) {
      throw new Error("AHP comparisons cannot compare a criterion with itself.");
    }
    const pairKey = JSON.stringify([criterionId, comparedCriterionId].sort());
    if (seenPairs.has(pairKey)) {
      throw new Error("AHP evaluation contains a duplicate criterion pair.");
    }
    seenPairs.add(pairKey);
    if (!isSaatyValue(comparison.value)) {
      throw new Error(`AHP comparison ${index + 1} is outside Saaty's scale.`);
    }
    return { criterionId, comparedCriterionId, value: comparison.value };
  });

  return { comparisons };
};

export const expectedComparisonCount = (criterionCount) =>
  Math.max(0, criterionCount * (criterionCount - 1) / 2);
