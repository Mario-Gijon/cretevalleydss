export const AHP_SAATY_SCALE_NAME = "AHP Saaty Scale";
export const AHP_SAATY_SCALE_KEY = "saaty-fundamental-1-9";
export const AHP_SAATY_SCALE_TOLERANCE = 1e-12;

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

export const getSaatyScaleValue = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return SAATY_SCALE_VALUES.find(
    (candidate) => Math.abs(candidate - value) <= AHP_SAATY_SCALE_TOLERANCE
  ) ?? null;
};

export const formatSaatyScaleLabel = (value) => {
  const canonicalValue = getSaatyScaleValue(value);
  if (canonicalValue === null) return "";
  if (canonicalValue === 1) return "1 — Neutral";
  if (canonicalValue < 1) return `1/${Math.round(1 / canonicalValue)}`;
  return String(canonicalValue);
};
