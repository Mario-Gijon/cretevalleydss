import {
  formatSaatyScaleLabel,
  getSaatyScaleValue,
  SAATY_SCALE_VALUES,
} from "../../../../../expressionDomains/types/numericSaaty/saatyScale.js";

export { getSaatyScaleValue, SAATY_SCALE_VALUES };

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

export const formatSaatyPreferenceLabel = formatSaatyScaleLabel;

export const SAATY_NORMALIZED_PREFERENCE_OPTIONS = Object.freeze(
  SAATY_SCALE_VALUES.map((saatyValue) => Object.freeze({
    saatyValue,
    normalizedValue: formatNormalizedPreferenceOption(saatyValue),
    label: formatSaatyPreferenceLabel(saatyValue),
  }))
);

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
