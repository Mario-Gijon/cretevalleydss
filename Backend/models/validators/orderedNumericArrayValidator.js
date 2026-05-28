export const orderedNumericArrayValidator = {
  validator(values) {
    return (
      Array.isArray(values) &&
      values.length >= 2 &&
      values.every((value) => typeof value === "number" && Number.isFinite(value)) &&
      values.every((value, index) => index === 0 || values[index - 1] <= value)
    );
  },
  message: "values must be an ordered numeric array with at least 2 elements",
};