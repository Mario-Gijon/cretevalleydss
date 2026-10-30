export const AHP_SAATY_SCALE_NAME = "AHP Saaty Scale";
export const AHP_SAATY_SCALE_KEY = "saaty-fundamental-1-9";
export const AHP_SAATY_SCALE_TOLERANCE = 1e-12;

export const AHP_SAATY_SCALE_VALUES = Object.freeze([
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

export const getAHPSaatyScaleValue = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return AHP_SAATY_SCALE_VALUES.find(
    (candidate) => Math.abs(candidate - value) <= AHP_SAATY_SCALE_TOLERANCE
  ) ?? null;
};
