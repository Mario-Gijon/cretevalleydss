import { AHP_SAATY_SCALE_KEY, getSaatyScaleValue } from "./saatyScale.js";

export const validateNumericSaatyEvaluation = ({ value, expressionDomain } = {}) => {
  const definition = expressionDomain?.definition;
  if (
    !definition ||
    typeof definition !== "object" ||
    Array.isArray(definition) ||
    Object.keys(definition).length !== 1 ||
    definition.scale !== AHP_SAATY_SCALE_KEY
  ) {
    throw new Error("AHP Saaty expression domain definition is invalid.");
  }

  const normalized = typeof value === "string" && value.trim() !== ""
    ? Number(value.trim())
    : value;
  const canonicalValue = getSaatyScaleValue(normalized);
  if (canonicalValue === null) {
    throw new Error("Value must be one of Saaty's 17 fundamental scale values.");
  }
  return canonicalValue;
};
