export const SAATY_SCALE_VALUES = Object.freeze([
  ...Array.from({ length: 9 }, (_, index) => index + 1),
  ...Array.from({ length: 8 }, (_, index) => 1 / (index + 2)),
]);

const NORMALIZED_VALUE_TOLERANCE = 0.000051;

export const saatyValueToNormalizedPreference = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value / (1 + value);
};

export const formatNormalizedPreference = (value) => {
  const normalized = saatyValueToNormalizedPreference(value);
  return normalized === null ? "" : normalized.toFixed(4);
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
