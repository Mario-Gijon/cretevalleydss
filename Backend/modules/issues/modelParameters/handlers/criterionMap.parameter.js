import {
  isAllowedValue,
  isWithinRange,
  normalizeNonEmptyString,
  normalizeNumberValue,
  toInvalid,
  toValid,
} from "../modelParameter.shared.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildLeafCriterionIndex = (leafCriteria) => {
  const allowedCriterionIds = new Set();
  const criterionNameById = new Map();
  const canonicalByCriterion = [];

  for (const criterion of leafCriteria) {
    const criterionId = normalizeNonEmptyString(criterion?.id);
    const criterionName = normalizeNonEmptyString(criterion?.name);
    if (!criterionId) {
      continue;
    }

    canonicalByCriterion.push(criterionId);
    allowedCriterionIds.add(criterionId);
    criterionNameById.set(criterionId, criterionName || criterionId);
  }

  return {
    allowedCriterionIds,
    criterionNameById,
    canonicalByCriterion,
  };
};

const normalizeEnumAllowed = (allowed) => {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return { allowed: null, kind: null };
  }

  const allNumbers = allowed.every(
    (item) => typeof item === "number" && Number.isFinite(item)
  );
  if (allNumbers) {
    return { allowed, kind: "number" };
  }

  const allStrings = allowed.every((item) => typeof item === "string");
  if (allStrings) {
    return {
      allowed: allowed.map((item) => item.trim()),
      kind: "string",
    };
  }

  return { allowed, kind: "mixed" };
};

const normalizeCriterionMapValue = ({ rawValue, valueType, restrictions }) => {
  if (valueType === "number") {
    const normalizedNumber = normalizeNumberValue(rawValue);
    if (normalizedNumber === null) {
      return toInvalid("must be a finite number", rawValue);
    }

    if (!isWithinRange(normalizedNumber, restrictions)) {
      return toInvalid(
        `must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
        rawValue
      );
    }

    return toValid(normalizedNumber);
  }

  if (valueType === "enum") {
    const { allowed, kind } = normalizeEnumAllowed(restrictions.allowed);
    if (!allowed) {
      return toInvalid("requires a non-empty restrictions.allowed array", rawValue);
    }

    let normalized = rawValue;

    if (kind === "number") {
      const numericValue = normalizeNumberValue(rawValue);
      if (numericValue === null) {
        return toInvalid("must be a finite number", rawValue);
      }
      normalized = numericValue;
    } else if (kind === "string") {
      if (typeof rawValue !== "string") {
        return toInvalid("must be a string", rawValue);
      }
      normalized = rawValue.trim();
    }

    if (!isAllowedValue(normalized, allowed)) {
      return toInvalid("must be one of the allowed enum values", normalized);
    }

    return toValid(normalized);
  }

  return toInvalid(`uses unsupported restrictions.valueType '${valueType}'`, rawValue);
};

export const validateAndNormalizeCriterionMapParameter = ({ value, parameter, context }) => {
  if (!isPlainObject(value)) {
    return toInvalid("must be an object keyed by criterion", value);
  }

  const restrictions = isPlainObject(parameter?.restrictions)
    ? parameter.restrictions
    : {};
  const valueType = normalizeNonEmptyString(restrictions.valueType) || "number";
  const requiredForEachCriterion = restrictions.requiredForEachCriterion === true;
  const leafCriteria = Array.isArray(context?.leafCriteria) ? context.leafCriteria : [];

  const { allowedCriterionIds, criterionNameById, canonicalByCriterion } = buildLeafCriterionIndex(
    leafCriteria
  );

  if (canonicalByCriterion.length === 0) {
    return toInvalid("cannot validate criterionMap without leaf criteria", value);
  }

  const normalizedByCriterion = {};

  for (const [inputKey, inputValue] of Object.entries(value)) {
    const normalizedInputKey = normalizeNonEmptyString(inputKey);
    if (!normalizedInputKey) {
      return toInvalid("contains an empty criterion key", inputKey);
    }

    if (!allowedCriterionIds.has(normalizedInputKey)) {
      return toInvalid(`contains unknown criterion key '${normalizedInputKey}'`, inputValue);
    }

    const normalizedResult = normalizeCriterionMapValue({
      rawValue: inputValue,
      valueType,
      restrictions,
    });

    if (!normalizedResult.ok) {
      const criterionName = criterionNameById.get(normalizedInputKey) || normalizedInputKey;
      return toInvalid(
        `[${criterionName}] ${normalizedResult.message}`,
        normalizedResult.value
      );
    }

    normalizedByCriterion[normalizedInputKey] = normalizedResult.value;
  }

  if (requiredForEachCriterion) {
    const missingCriterionKey = canonicalByCriterion.find(
      (criterionKey) => !Object.prototype.hasOwnProperty.call(normalizedByCriterion, criterionKey)
    );

    if (missingCriterionKey) {
      return toInvalid(
        `is missing required value for criterion '${missingCriterionKey}'`,
        value
      );
    }
  }

  return toValid(normalizedByCriterion);
};
