import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import { getOrderedCriterionNames } from "../shared/criteriaWeighting.helpers.js";

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

export const resolveAllowEmptyFromModeOrThrow = (mode) => {
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

export const normalizeManualPayloadOrThrow = async ({
  payload,
  issue,
  allowEmpty,
}) => {
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

export const validateSubmittedManualWeightsOrThrow = ({
  weightsByCriterion,
  criterionNames,
}) => {
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
