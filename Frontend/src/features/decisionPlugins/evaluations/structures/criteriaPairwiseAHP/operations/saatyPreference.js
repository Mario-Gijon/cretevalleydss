export const SAATY_SCALE_VALUES = Object.freeze([
  1 / 9,
  1 / 8,
  1 / 7,
  1 / 6,
  1 / 5,
  1 / 4,
  1 / 3,
  1 / 2,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
]);

export const AHP_NORMALIZED_PREFERENCE_DECIMAL_PLACES = 4;
export const AHP_SELECT_DISPLAY_DECIMAL_PLACES = 3;
const NORMALIZED_VALUE_TOLERANCE = 0.000051;

export const formatNormalizedPreferenceOption = (value) => {
  const normalized = saatyValueToNormalizedPreference(value);
  return normalized === null
    ? ""
    : normalized.toFixed(AHP_SELECT_DISPLAY_DECIMAL_PLACES);
};

export const saatyValueToNormalizedPreference = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value / (1 + value);
};

export const SAATY_NORMALIZED_PREFERENCE_OPTIONS = Object.freeze(
  SAATY_SCALE_VALUES.map((saatyValue) => Object.freeze({
    saatyValue,
    normalizedValue: formatNormalizedPreferenceOption(saatyValue),
  }))
);

export const getSaatyScaleValue = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return SAATY_SCALE_VALUES.find((allowed) => Math.abs(allowed - value) <= 1e-12) ?? null;
};

export const getSaatyNormalizedPreferenceOption = (value) => {
  const saatyValue = getSaatyScaleValue(value);
  return SAATY_NORMALIZED_PREFERENCE_OPTIONS.find(
    (option) => option.saatyValue === saatyValue
  ) ?? null;
};

export const formatNormalizedPreference = (value) => {
  const normalized = saatyValueToNormalizedPreference(value);
  return normalized === null
    ? ""
    : normalized.toFixed(AHP_NORMALIZED_PREFERENCE_DECIMAL_PLACES);
};

// The UI uses p = a / (1 + a), where a is the AHP judgment ratio. This keeps
// the visible value in [0, 1], makes the reciprocal 1 - p, and maps accepted
// values back to the exact Saaty value before the evaluation is persisted.
export const normalizedPreferenceToSaatyValue = (rawValue) => {
  if (typeof rawValue !== "string" || rawValue.trim() === "") return null;
  const normalized = Number(rawValue);
  if (!Number.isFinite(normalized) || normalized <= 0 || normalized >= 1) {
    return null;
  }

  return SAATY_SCALE_VALUES.find((value) =>
    Math.abs(saatyValueToNormalizedPreference(value) - normalized)
      <= NORMALIZED_VALUE_TOLERANCE
  ) ?? null;
};
