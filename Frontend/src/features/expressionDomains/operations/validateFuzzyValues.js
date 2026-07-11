export const validateFuzzyValuesOrThrow = ({
  values,
  epsilon,
  field = "values",
  emptyMessage = `${field} must be a non-empty array.`,
} = {}) => {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(emptyMessage);
  }

  if (
    epsilon !== undefined &&
    (typeof epsilon !== "number" || !Number.isFinite(epsilon) || epsilon < 0)
  ) {
    throw new Error("epsilon must be a non-negative finite number.");
  }

  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    const itemField = `${field}[${index}]`;

    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error(`${itemField} must be a finite number.`);
    }

    if (item < 0 || item > 1) {
      throw new Error(`${itemField} must be between 0 and 1.`);
    }

    if (index > 0 && item < values[index - 1]) {
      throw new Error(`${field} must be non-decreasing.`);
    }
  }

  return values;
};

