import {
  isAllowedValue,
  normalizeNonEmptyString,
  normalizeNumberValue,
} from "../parameterValues.js";
import { isWithinRange } from "../parameterRestrictions.js";
import {
  toInvalid,
  toValid,
} from "../parameterValidationResult.js";
import { hasOwnKey, isPlainObject } from "../../../../utils/common/objects.js";

const buildLeafCriterionIndex = (leafCriteria) => {
  const allowedCriterionKeys = new Set();
  const criterionNameByCanonical = new Map();
  const canonicalByInputKey = new Map();
  const canonicalByCriterion = [];

  for (const criterion of leafCriteria) {
    const criterionId = normalizeNonEmptyString(criterion?.id);
    const criterionObjectId = normalizeNonEmptyString(criterion?._id);
    const criterionKey = normalizeNonEmptyString(criterion?.key);
    const criterionName = normalizeNonEmptyString(criterion?.name);
    const canonicalKey = criterionId || criterionObjectId || criterionKey || criterionName;
    if (!canonicalKey) {
      continue;
    }

    const aliases = [criterionId, criterionObjectId, criterionKey, criterionName].filter(
      Boolean
    );

    canonicalByCriterion.push(canonicalKey);
    criterionNameByCanonical.set(canonicalKey, criterionName || canonicalKey);

    for (const alias of aliases) {
      allowedCriterionKeys.add(alias);
      canonicalByInputKey.set(alias, canonicalKey);
    }
  }

  return {
    allowedCriterionKeys,
    criterionNameByCanonical,
    canonicalByInputKey,
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

const expandScalarCriterionMap = ({
  scalarValue,
  canonicalByCriterion,
}) => {
  return canonicalByCriterion.reduce((accumulator, criterionKey) => {
    accumulator[criterionKey] = scalarValue;
    return accumulator;
  }, {});
};

export const validateAndNormalizeCriterionMapParameter = ({ value, parameter, context }) => {
  const restrictions = isPlainObject(parameter?.restrictions)
    ? parameter.restrictions
    : {};
  const valueType = normalizeNonEmptyString(restrictions.valueType) || "number";
  const requiredForEachCriterion = restrictions.requiredForEachCriterion === true;
  const leafCriteria = Array.isArray(context?.leafCriteria) ? context.leafCriteria : [];

  const { allowedCriterionKeys, criterionNameByCanonical, canonicalByInputKey, canonicalByCriterion } = buildLeafCriterionIndex(
    leafCriteria
  );

  if (canonicalByCriterion.length === 0) {
    return toInvalid("cannot validate criterionMap without leaf criteria", value);
  }

  let inputValue = value;
  if (!isPlainObject(inputValue)) {
    if (!requiredForEachCriterion) {
      return toInvalid("must be an object keyed by criterion", value);
    }

    inputValue = expandScalarCriterionMap({
      scalarValue: value,
      canonicalByCriterion,
    });
  }

  const normalizedByCriterion = {};

  for (const [inputKey, rawCriterionValue] of Object.entries(inputValue)) {
    const normalizedInputKey = normalizeNonEmptyString(inputKey);
    if (!normalizedInputKey) {
      return toInvalid("contains an empty criterion key", inputKey);
    }

    if (!allowedCriterionKeys.has(normalizedInputKey)) {
      return toInvalid(`contains unknown criterion key '${normalizedInputKey}'`, rawCriterionValue);
    }

    const canonicalKey = canonicalByInputKey.get(normalizedInputKey) || normalizedInputKey;

    const normalizedResult = normalizeCriterionMapValue({
      rawValue: rawCriterionValue,
      valueType,
      restrictions,
    });

    if (!normalizedResult.ok) {
      const criterionName = criterionNameByCanonical.get(canonicalKey) || canonicalKey;
      return toInvalid(
        `[${criterionName}] ${normalizedResult.message}`,
        normalizedResult.value
      );
    }

    normalizedByCriterion[canonicalKey] = normalizedResult.value;
  }

  if (requiredForEachCriterion) {
    const missingCriterionKey = canonicalByCriterion.find(
      (criterionKey) => !hasOwnKey(normalizedByCriterion, criterionKey)
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
