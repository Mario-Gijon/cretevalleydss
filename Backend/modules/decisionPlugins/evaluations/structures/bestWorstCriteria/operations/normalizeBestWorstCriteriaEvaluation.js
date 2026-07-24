import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";

export const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeComparisonValueOrThrow = (rawValue, { field }) => {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return "";
  }

  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    throw createBadRequestError("Comparison value must be a finite number", {
      field,
    });
  }

  return numericValue;
};

const buildCriterionItemsOrThrow = (decisionContext) => {
  if (!Array.isArray(decisionContext?.leafCriteria)) {
    throw createBadRequestError("decisionContext.leafCriteria must be an array", {
      field: "decisionContext.leafCriteria",
    });
  }

  return decisionContext.leafCriteria.map((criterion, index) => {
    const id = normalizeText(criterion?.id ?? criterion?._id);
    const name = normalizeText(criterion?.name);

    if (!id) {
      throw createBadRequestError("Each criterion must have a non-empty id", {
        field: `decisionContext.leafCriteria[${index}].id`,
      });
    }

    if (!name) {
      throw createBadRequestError("Each criterion must have a non-empty name", {
        field: `decisionContext.leafCriteria[${index}].name`,
      });
    }

    return { id, name };
  });
};

const normalizeComparisonsMapOrThrow = (
  rawComparisons,
  criterionItems,
  { field }
) => {
  const safeComparisons = rawComparisons === undefined ? {} : rawComparisons;

  if (!isPlainObject(safeComparisons)) {
    throw createBadRequestError(`${field} must be an object`, {
      field,
    });
  }

  return criterionItems.reduce((accumulator, criterion) => {
    accumulator[criterion.id] = normalizeComparisonValueOrThrow(
      safeComparisons[criterion.id],
      { field }
    );
    return accumulator;
  }, {});
};

export const normalizeBestWorstCriteriaEvaluation = async ({
  payload,
  decisionContext,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const criterionItems = buildCriterionItemsOrThrow(decisionContext);

  const bestCriterion = normalizeText(payload.bestCriterion);
  const worstCriterion = normalizeText(payload.worstCriterion);

  const bestToOthers = normalizeComparisonsMapOrThrow(
    payload.bestToOthers,
    criterionItems,
    {
      field: "payload.bestToOthers",
    }
  );

  const othersToWorst = normalizeComparisonsMapOrThrow(
    payload.othersToWorst,
    criterionItems,
    {
      field: "payload.othersToWorst",
    }
  );

  if (bestCriterion) {
    bestToOthers[bestCriterion] = 1;
  }

  if (worstCriterion) {
    othersToWorst[worstCriterion] = 1;
  }

  return {
    criterionItems,
    payload: {
      bestCriterion,
      worstCriterion,
      bestToOthers,
      othersToWorst,
    },
  };
};
