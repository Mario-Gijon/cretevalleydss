import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { getOrderedCriterionNames } from "../shared/criteriaWeighting.helpers.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

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

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  async get({ storedEvaluation, issue }) {
    const { criterionNames } = await getOrderedCriterionNames({ issue });

    if (!storedEvaluation) {
      return {
        weightsByCriterion: buildEmptyWeightsByCriterion(criterionNames),
      };
    }

    return {
      weightsByCriterion: toWeightsByCriterionFromStoredPayload(
        storedEvaluation?.payload?.weightsByCriterion,
        criterionNames
      ),
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
