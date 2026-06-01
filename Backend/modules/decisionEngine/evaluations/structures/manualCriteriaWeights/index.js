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

const resolveAllowEmptyFromModeOrThrow = (mode) => {
  if (mode === EVALUATION_SAVE_MODES.DRAFT) {
    return true;
  }

  if (mode === EVALUATION_SAVE_MODES.SUBMIT) {
    return false;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};

const buildEmptyWeightsByCriterion = (criterionNames) =>
  criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = "";
    return accumulator;
  }, {});

const normalizeWeightValueOrThrow = (rawValue, { criterionName, allowEmpty }) => {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    if (allowEmpty) {
      return "";
    }

    throw createBadRequestError(
      `Weight for criterion '${criterionName}' is required`,
      {
        field: "payload.weightsByCriterion",
      }
    );
  }

  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    throw createBadRequestError(
      `Weight for criterion '${criterionName}' must be a finite number`,
      {
        field: "payload.weightsByCriterion",
      }
    );
  }

  return numericValue;
};

const normalizeManualPayloadOrThrow = async ({ payload, issue, allowEmpty }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const rawWeightsByCriterion = payload.weightsByCriterion;

  if (!isPlainObject(rawWeightsByCriterion)) {
    throw createBadRequestError("payload.weightsByCriterion must be an object", {
      field: "payload.weightsByCriterion",
    });
  }

  const { criterionNames } = await getOrderedCriterionNames({ issue });

  const weightsByCriterion = criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = normalizeWeightValueOrThrow(
      rawWeightsByCriterion[criterionName],
      {
        criterionName,
        allowEmpty,
      }
    );
    return accumulator;
  }, {});

  return {
    criterionNames,
    payload: {
      weightsByCriterion,
    },
  };
};

const validateSubmittedManualWeightsOrThrow = ({ weightsByCriterion, criterionNames }) => {
  const numericWeights = criterionNames.map((criterionName) => {
    const value = weightsByCriterion[criterionName];

    if (!Number.isFinite(value)) {
      throw createBadRequestError(
        `Weight for criterion '${criterionName}' must be a finite number`,
        {
          field: "payload.weightsByCriterion",
        }
      );
    }

    if (value < 0 || value > 1) {
      throw createBadRequestError(
        `Weight for criterion '${criterionName}' must be between 0 and 1`,
        {
          field: "payload.weightsByCriterion",
        }
      );
    }

    return value;
  });

  const sum = numericWeights.reduce((total, value) => total + value, 0);

  if (Math.abs(sum - 1) > 0.001) {
    throw createBadRequestError("Submitted manual weights must sum to 1", {
      field: "payload.weightsByCriterion",
    });
  }
};

const toWeightsByCriterionFromStoredPayload = (storedPayloadWeights, criterionNames) => {
  const normalizedStoredWeights = isPlainObject(storedPayloadWeights)
    ? storedPayloadWeights
    : {};

  return criterionNames.reduce((accumulator, criterionName) => {
    const value = normalizedStoredWeights[criterionName];
    accumulator[criterionName] = value === undefined ? "" : value;
    return accumulator;
  }, {});
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
  };
};

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  label: "Manual weights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  async get({ storedEvaluation, issue, criteria, includeMeta = false }) {
    const criterionNames = await resolveCriterionNames({ issue, criteria });

    const payload = !storedEvaluation
      ? {
          weightsByCriterion: buildEmptyWeightsByCriterion(criterionNames),
        }
      : {
          weightsByCriterion: toWeightsByCriterionFromStoredPayload(
            storedEvaluation?.payload?.weightsByCriterion,
            criterionNames
          ),
        };

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
    const allowEmpty = resolveAllowEmptyFromModeOrThrow(mode);

    const normalized = await normalizeManualPayloadOrThrow({
      payload,
      issue,
      allowEmpty,
    });

    if (mode === EVALUATION_SAVE_MODES.SUBMIT) {
      validateSubmittedManualWeightsOrThrow({
        weightsByCriterion: normalized.payload.weightsByCriterion,
        criterionNames: normalized.criterionNames,
      });
    }

    return normalized.payload;
  },
});
