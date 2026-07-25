import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { validatePayloadShape } from "./validatePayloadShape.js";

const WEIGHT_SUM_TOLERANCE = 0.001;

const normalizeWeightValue = ({ value, field, requireValue }) => {
  if (value === "") {
    if (requireValue) {
      throw createBadRequestError("Weight is required for submit", { field });
    }

    return "";
  }

  const numericValue =
    typeof value === "string" && value.trim() !== ""
      ? Number(value.trim())
      : value;

  if (
    typeof numericValue !== "number" ||
    !Number.isFinite(numericValue) ||
    numericValue < 0 ||
    numericValue > 1
  ) {
    throw createBadRequestError(
      "Weight must be a finite number between 0 and 1",
      { field }
    );
  }

  return numericValue;
};

export const normalizePayload = ({ payload, criteria, requireValue }) => {
  validatePayloadShape({ payload, criteria });

  const weightsByCriterion = Object.fromEntries(
    criteria.map((criterion) => [
      criterion.id,
      normalizeWeightValue({
        value: payload.weightsByCriterion[criterion.id],
        field: `payload.weightsByCriterion.${criterion.id}`,
        requireValue,
      }),
    ])
  );

  if (requireValue) {
    const total = Object.values(weightsByCriterion).reduce(
      (sum, weight) => sum + weight,
      0
    );

    if (Math.abs(total - 1) > WEIGHT_SUM_TOLERANCE) {
      throw createBadRequestError("Manual weights must sum to 1", {
        field: "payload.weightsByCriterion",
      });
    }
  }

  return { weightsByCriterion };
};
