import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";
import { resolveCriteria } from "./resolveCriteria.js";
import { validatePayloadShape } from "./validatePayloadShape.js";

const MAX_CRITERIA = 15;
const SCALE = [
  ...Array.from({ length: 9 }, (_, index) => index + 1),
  ...Array.from({ length: 8 }, (_, index) => 1 / (index + 2)),
];
const isSaatyValue = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  SCALE.some((allowed) => Math.abs(value - allowed) <= 1e-12);

export const normalizePayload = ({ payload, decisionContext, requireValue }) => {
  const criteria = resolveCriteria({ decisionContext });
  if (criteria.length > MAX_CRITERIA) {
    throw createBadRequestError(
      `AHP supports at most ${MAX_CRITERIA} criteria with the configured consistency table`,
      { field: "decisionContext.criteriaWeightingCriteria" }
    );
  }
  validatePayloadShape({ payload });

  const ids = new Set(criteria.map((criterion) => criterion.id));
  const criterionOrder = new Map(criteria.map((criterion, index) => [criterion.id, index]));
  const seenPairs = new Set();
  const comparisons = payload.comparisons.map((source, index) => {
    const field = `payload.comparisons[${index}]`;
    if (
      source === null ||
      typeof source !== "object" ||
      Array.isArray(source) ||
      Object.keys(source).length !== 3 ||
      !Object.hasOwn(source, "criterionId") ||
      !Object.hasOwn(source, "comparedCriterionId") ||
      !Object.hasOwn(source, "value")
    ) {
      throw createBadRequestError(
        "AHP comparison must contain criterionId, comparedCriterionId and value",
        { field }
      );
    }

    const criterionId = normalizeNonEmptyString(source.criterionId);
    const comparedCriterionId = normalizeNonEmptyString(
      source.comparedCriterionId
    );
    if (!criterionId || !comparedCriterionId) {
      throw createBadRequestError("AHP comparison criterion ids are required", {
        field,
      });
    }
    if (!ids.has(criterionId) || !ids.has(comparedCriterionId)) {
      throw createBadRequestError(
        "AHP comparison references an unknown criterion id",
        { field }
      );
    }
    if (criterionId === comparedCriterionId) {
      throw createBadRequestError(
        "AHP comparisons cannot compare a criterion with itself",
        { field }
      );
    }

    const pair = [criterionId, comparedCriterionId].sort();
    const pairKey = JSON.stringify(pair);
    if (seenPairs.has(pairKey)) {
      throw createBadRequestError(
        "AHP must store only one judgment for each unordered criterion pair",
        { field }
      );
    }
    seenPairs.add(pairKey);

    const rawValue = source.value;
    const value =
      typeof rawValue === "string" && rawValue.trim() !== ""
        ? Number(rawValue.trim())
        : rawValue;
    if (!isSaatyValue(value)) {
      throw createBadRequestError(
        "AHP comparison must use Saaty's 1–9 scale or a reciprocal value",
        { field: `${field}.value` }
      );
    }

    return { criterionId, comparedCriterionId, value };
  });

  comparisons.sort((left, right) => {
    const leftFirst = criterionOrder.get(left.criterionId);
    const rightFirst = criterionOrder.get(right.criterionId);
    return leftFirst - rightFirst ||
      criterionOrder.get(left.comparedCriterionId) -
        criterionOrder.get(right.comparedCriterionId);
  });

  const required = criteria.length * (criteria.length - 1) / 2;
  if (requireValue && comparisons.length !== required) {
    throw createBadRequestError(
      `All criterion comparisons are required for submit (${comparisons.length} of ${required} complete)`,
      { field: "payload.comparisons" }
    );
  }

  return { comparisons };
};
