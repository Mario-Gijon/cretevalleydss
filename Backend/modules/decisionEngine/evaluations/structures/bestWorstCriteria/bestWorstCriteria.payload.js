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

const normalizeComparisonsMapOrThrow = (
  rawComparisons,
  criterionNames,
  { field }
) => {
  if (!isPlainObject(rawComparisons)) {
    throw createBadRequestError(`${field} must be an object`, {
      field,
    });
  }

  return criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = normalizeComparisonValueOrThrow(
      rawComparisons[criterionName],
      { field }
    );
    return accumulator;
  }, {});
};

export const normalizePayloadOrThrow = async ({
  payload,
  structureContext,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const criterionNames = Array.isArray(structureContext?.leafCriteria)
    ? structureContext.leafCriteria
        .map((criterion) =>
          typeof criterion === "string"
            ? criterion.trim()
            : String(criterion?.name || "").trim()
        )
        .filter(Boolean)
    : [];

  const bestCriterion = normalizeText(payload.bestCriterion);
  const worstCriterion = normalizeText(payload.worstCriterion);

  const bestToOthers = normalizeComparisonsMapOrThrow(
    payload.bestToOthers,
    criterionNames,
    {
      field: "payload.bestToOthers",
    }
  );

  const othersToWorst = normalizeComparisonsMapOrThrow(
    payload.othersToWorst,
    criterionNames,
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
    criterionNames,
    payload: {
      bestCriterion,
      worstCriterion,
      bestToOthers,
      othersToWorst,
    },
  };
};

export const validateSubmittedBwmPayloadOrThrow = ({
  criterionNames,
  payload,
}) => {
  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = payload;

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

  if (!criterionNames.includes(bestCriterion)) {
    throw createBadRequestError("bestCriterion must be a valid criterion name", {
      field: "payload.bestCriterion",
    });
  }

  if (!criterionNames.includes(worstCriterion)) {
    throw createBadRequestError("worstCriterion must be a valid criterion name", {
      field: "payload.worstCriterion",
    });
  }

  if (criterionNames.length > 1 && bestCriterion === worstCriterion) {
    throw createBadRequestError(
      "bestCriterion and worstCriterion must be different",
      {
        field: "payload.worstCriterion",
      }
    );
  }

  for (const criterionName of criterionNames) {
    const bestToOthersValue = Number(bestToOthers[criterionName]);
    const othersToWorstValue = Number(othersToWorst[criterionName]);

    if (criterionName !== bestCriterion) {
      if (
        !Number.isInteger(bestToOthersValue) ||
        bestToOthersValue < 1 ||
        bestToOthersValue > 9
      ) {
        throw createBadRequestError(
          `bestToOthers['${criterionName}'] must be an integer between 1 and 9`,
          {
            field: "payload.bestToOthers",
          }
        );
      }
    }

    if (criterionName !== worstCriterion) {
      if (
        !Number.isInteger(othersToWorstValue) ||
        othersToWorstValue < 1 ||
        othersToWorstValue > 9
      ) {
        throw createBadRequestError(
          `othersToWorst['${criterionName}'] must be an integer between 1 and 9`,
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
