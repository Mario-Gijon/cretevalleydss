import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

export const validateSaveModeOrThrow = (mode) => {
  if (mode === EVALUATION_SAVE_MODES.DRAFT || mode === EVALUATION_SAVE_MODES.SUBMIT) {
    return;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};

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

const buildCriterionItemsOrThrow = (evaluationContext) => {
  if (!Array.isArray(evaluationContext?.leafCriteria)) {
    throw createBadRequestError("evaluationContext.leafCriteria must be an array", {
      field: "evaluationContext.leafCriteria",
    });
  }

  return evaluationContext.leafCriteria.map((criterion, index) => {
    const id = normalizeText(criterion?.id ?? criterion?._id);
    const name = normalizeText(criterion?.name);

    if (!id) {
      throw createBadRequestError("Each criterion must have a non-empty id", {
        field: `evaluationContext.leafCriteria[${index}].id`,
      });
    }

    if (!name) {
      throw createBadRequestError("Each criterion must have a non-empty name", {
        field: `evaluationContext.leafCriteria[${index}].name`,
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
  if (!isPlainObject(rawComparisons)) {
    throw createBadRequestError(`${field} must be an object`, {
      field,
    });
  }

  return criterionItems.reduce((accumulator, criterion) => {
    accumulator[criterion.id] = normalizeComparisonValueOrThrow(
      rawComparisons[criterion.id],
      { field }
    );
    return accumulator;
  }, {});
};

export const normalizePayloadOrThrow = async ({
  payload,
  evaluationContext,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const criterionItems = buildCriterionItemsOrThrow(evaluationContext);

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

export const validateSubmittedBwmPayloadOrThrow = ({
  criterionItems,
  payload,
}) => {
  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = payload;
  const criterionIds = criterionItems.map((criterion) => criterion.id);

  if (!bestCriterion) {
    throw createBadRequestError("bestCriterion is required", {
      field: "payload.bestCriterion",
    });
  }

  if (!worstCriterion) {
    throw createBadRequestError("worstCriterion is required", {
      field: "payload.worstCriterion",
    });
  }

  if (!criterionIds.includes(bestCriterion)) {
    throw createBadRequestError("bestCriterion must be a valid criterion id", {
      field: "payload.bestCriterion",
    });
  }

  if (!criterionIds.includes(worstCriterion)) {
    throw createBadRequestError("worstCriterion must be a valid criterion id", {
      field: "payload.worstCriterion",
    });
  }

  if (criterionIds.length > 1 && bestCriterion === worstCriterion) {
    throw createBadRequestError(
      "bestCriterion and worstCriterion must be different",
      {
        field: "payload.worstCriterion",
      }
    );
  }

  for (const criterion of criterionItems) {
    const bestToOthersValue = Number(bestToOthers[criterion.id]);
    const othersToWorstValue = Number(othersToWorst[criterion.id]);

    if (criterion.id !== bestCriterion) {
      if (
        !Number.isInteger(bestToOthersValue) ||
        bestToOthersValue < 1 ||
        bestToOthersValue > 9
      ) {
        throw createBadRequestError(
          `bestToOthers['${criterion.id}'] for '${criterion.name}' must be an integer between 1 and 9`,
          {
            field: "payload.bestToOthers",
          }
        );
      }
    }

    if (criterion.id !== worstCriterion) {
      if (
        !Number.isInteger(othersToWorstValue) ||
        othersToWorstValue < 1 ||
        othersToWorstValue > 9
      ) {
        throw createBadRequestError(
          `othersToWorst['${criterion.id}'] for '${criterion.name}' must be an integer between 1 and 9`,
          {
            field: "payload.othersToWorst",
          }
        );
      }
    }
  }

  if (Number(bestToOthers[bestCriterion]) !== 1) {
    throw createBadRequestError("bestToOthers[bestCriterion] must be 1", {
      field: "payload.bestToOthers",
    });
  }

  if (Number(othersToWorst[worstCriterion]) !== 1) {
    throw createBadRequestError("othersToWorst[worstCriterion] must be 1", {
      field: "payload.othersToWorst",
    });
  }
};
