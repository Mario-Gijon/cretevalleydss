import { createBadRequestError } from "../../../utils/common/errors.js";

export const validateFuzzyValuesOrThrow = ({
  values,
  epsilon,
  field = "values",
  emptyMessage = `${field} must be a non-empty array.`,
} = {}) => {
  if (!Array.isArray(values) || values.length === 0) {
    throw createBadRequestError(emptyMessage, { field });
  }

  if (
    epsilon !== undefined &&
    (typeof epsilon !== "number" || !Number.isFinite(epsilon) || epsilon < 0)
  ) {
    throw createBadRequestError("epsilon must be a non-negative finite number.", {
      field: "epsilon",
    });
  }

  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    const itemField = `${field}[${index}]`;

    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw createBadRequestError(`${itemField} must be a finite number.`, {
        field: itemField,
      });
    }

    if (item < 0 || item > 1) {
      throw createBadRequestError(`${itemField} must be between 0 and 1.`, {
        field: itemField,
      });
    }

    if (index > 0 && item < values[index - 1]) {
      throw createBadRequestError(`${field} must be non-decreasing.`, {
        field,
      });
    }
  }

  return values;
};

