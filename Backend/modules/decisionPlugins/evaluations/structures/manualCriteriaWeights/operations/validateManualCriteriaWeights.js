import { createBadRequestError } from "../../../../../../utils/common/errors.js";

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

export const resolveManualWeightsAllowEmptyOrThrow = (mode) => {
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

export const validateSubmittedManualWeightsOrThrow = ({
  weightsByCriterion,
  criteria,
}) => {
  const numericWeights = criteria.map((criterion) => {
    const value = weightsByCriterion[criterion.id];

    if (!Number.isFinite(value)) {
      throw createBadRequestError(
        `Weight for criterion '${criterion.name}' must be a finite number`,
        {
          field: "payload.weightsByCriterion",
        }
      );
    }

    if (value < 0 || value > 1) {
      throw createBadRequestError(
        `Weight for criterion '${criterion.name}' must be between 0 and 1`,
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
