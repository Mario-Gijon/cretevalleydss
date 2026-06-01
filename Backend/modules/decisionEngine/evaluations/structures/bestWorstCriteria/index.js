import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import { getOrderedCriterionNames } from "../shared/criteriaWeighting.helpers.js";

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

const validateSaveModeOrThrow = (mode) => {
  if (mode === EVALUATION_SAVE_MODES.DRAFT || mode === EVALUATION_SAVE_MODES.SUBMIT) {
    return;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const buildEmptyComparisons = (criterionNames) =>
  criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = "";
    return accumulator;
  }, {});

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

const normalizeComparisonsMapOrThrow = (rawComparisons, criterionNames, { field }) => {
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

const normalizePayloadOrThrow = async ({ payload, issue }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const { criterionNames } = await getOrderedCriterionNames({ issue });

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

const validateSubmittedBwmPayloadOrThrow = ({ criterionNames, payload }) => {
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

const mergeStoredPayload = ({ storedPayload, criterionNames }) => {
  const payload = isPlainObject(storedPayload) ? storedPayload : {};
  const bestToOthersSource = isPlainObject(payload.bestToOthers)
    ? payload.bestToOthers
    : {};
  const othersToWorstSource = isPlainObject(payload.othersToWorst)
    ? payload.othersToWorst
    : {};

  return {
    bestCriterion: normalizeText(payload.bestCriterion),
    worstCriterion: normalizeText(payload.worstCriterion),
    bestToOthers: criterionNames.reduce((accumulator, criterionName) => {
      accumulator[criterionName] =
        bestToOthersSource[criterionName] === undefined
          ? ""
          : bestToOthersSource[criterionName];
      return accumulator;
    }, {}),
    othersToWorst: criterionNames.reduce((accumulator, criterionName) => {
      accumulator[criterionName] =
        othersToWorstSource[criterionName] === undefined
          ? ""
          : othersToWorstSource[criterionName];
      return accumulator;
    }, {}),
  };
};

const orderObjectByKeys = (obj, orderedKeys) => {
  const orderedObject = {};
  const usedKeys = new Set();

  for (const key of orderedKeys) {
    orderedObject[key] = Object.prototype.hasOwnProperty.call(obj, key)
      ? obj[key]
      : null;
    usedKeys.add(key);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (!usedKeys.has(key)) {
      orderedObject[key] = value;
    }
  }

  return orderedObject;
};

const resolveCriterionNames = async ({ issue, criteria }) => {
  if (Array.isArray(criteria) && criteria.length > 0) {
    return criteria
      .map((criterion) =>
        typeof criterion === "string"
          ? criterion.trim()
          : String(criterion?.name || "").trim()
      )
      .filter(Boolean);
  }

  const { criterionNames } = await getOrderedCriterionNames({ issue });
  return criterionNames;
};

const buildDisplayMeta = ({ storedEvaluation, criterionNames }) => {
  const rawPayload = isPlainObject(storedEvaluation?.payload)
    ? storedEvaluation.payload
    : {};

  return {
    manualWeights: storedEvaluation && isPlainObject(rawPayload.weightsByCriterion)
      ? orderObjectByKeys(rawPayload.weightsByCriterion, criterionNames)
      : null,
    bwm: {
      bestCriterion: rawPayload?.bestCriterion,
      worstCriterion: rawPayload?.worstCriterion,
      bestToOthers: orderObjectByKeys(rawPayload?.bestToOthers ?? {}, criterionNames),
      othersToWorst: orderObjectByKeys(rawPayload?.othersToWorst ?? {}, criterionNames),
    },
  };
};

export const bestWorstCriteriaStructure = Object.freeze({
  key: "bestWorstCriteria",
  label: "Best-worst weights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  async get({ storedEvaluation, issue, criteria, includeMeta = false }) {
    const criterionNames = await resolveCriterionNames({ issue, criteria });

    const payload = !storedEvaluation
      ? {
          bestCriterion: "",
          worstCriterion: "",
          bestToOthers: buildEmptyComparisons(criterionNames),
          othersToWorst: buildEmptyComparisons(criterionNames),
        }
      : mergeStoredPayload({
          storedPayload: storedEvaluation?.payload,
          criterionNames,
        });

    if (!includeMeta) {
      return payload;
    }

    return {
      ...payload,
      meta: {
        display: buildDisplayMeta({
          storedEvaluation,
          criterionNames,
        }),
      },
    };
  },

  async save({ payload, issue, mode }) {
    validateSaveModeOrThrow(mode);

    const normalized = await normalizePayloadOrThrow({ payload, issue });

    if (mode === EVALUATION_SAVE_MODES.SUBMIT) {
      validateSubmittedBwmPayloadOrThrow({
        criterionNames: normalized.criterionNames,
        payload: normalized.payload,
      });
    }

    return normalized.payload;
  },
});
