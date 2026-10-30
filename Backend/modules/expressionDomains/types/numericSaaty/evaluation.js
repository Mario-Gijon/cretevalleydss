import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import {
  AHP_SAATY_SCALE_KEY,
  getAHPSaatyScaleValue,
} from "./saatyScale.js";

const normalizeFiniteNumber = (value) => {
  const normalized = typeof value === "string" && value.trim() !== ""
    ? Number(value.trim())
    : value;
  if (typeof normalized !== "number" || !Number.isFinite(normalized)) {
    throw createBadRequestError("Value must be a finite number.", { field: "value" });
  }
  return normalized;
};

export const validateNumericSaatyEvaluation = ({ value, expressionDomain } = {}) => {
  const definition = expressionDomain?.definition;
  if (
    !isPlainObject(definition) ||
    Object.keys(definition).length !== 1 ||
    definition.scale !== AHP_SAATY_SCALE_KEY
  ) {
    throw createBadRequestError("AHP Saaty expression domain definition is invalid.", {
      field: "expressionDomain.definition",
    });
  }

  const normalized = normalizeFiniteNumber(value);
  const saatyValue = getAHPSaatyScaleValue(normalized);
  if (saatyValue === null) {
    throw createBadRequestError("Value must be one of Saaty's 17 fundamental scale values.", {
      field: "value",
    });
  }
  return saatyValue;
};
