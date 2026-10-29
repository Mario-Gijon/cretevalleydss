const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const normalizeAHPSortGroupValue = (_parameter, value) => {
  if (!isPlainObject(value)) return value;
  return { ...value };
};

export const validateAHPSortGroupValue = (_parameter, value, parameterContext) => {
  const expertCount = Number.isInteger(parameterContext?.selectedExpertCount)
    ? parameterContext.selectedExpertCount
    : 0;
  const isRequired = expertCount >= 2;

  if (value === undefined && !isRequired) return null;
  if (!isPlainObject(value)) {
    return isRequired
      ? "Choose an equal-vote preference for group classification."
      : "Choose a valid equal-vote preference or leave it unset for individual classification.";
  }
  if (Object.keys(value).length !== 1 || !Object.hasOwn(value, "tiePolicy")) {
    return "Review the group classification settings.";
  }
  if (value.tiePolicy !== "optimistic" && value.tiePolicy !== "pessimistic") {
    return "Choose an equal-vote preference for group classification.";
  }
  return null;
};
