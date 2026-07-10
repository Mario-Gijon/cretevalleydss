import { createBadRequestError } from "../../../../utils/common/errors.js";
import {
  assertPlainDefinitionOrThrow,
  isNonEmptyString,
} from "../../shared/validation.js";

const MEMBERSHIP_FUNCTION_LENGTHS = {
  triangular: 3,
  trapezoidal: 4,
  hexagonal: 6,
};

const normalizeLabelKeyFromText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeMembershipFunctionOrThrow = (value) => {
  if (!isNonEmptyString(value) || !Object.hasOwn(MEMBERSHIP_FUNCTION_LENGTHS, value.trim())) {
    throw createBadRequestError(
      "definition.membershipFunction must be triangular, trapezoidal, or hexagonal.",
      { field: "definition.membershipFunction" }
    );
  }

  return value.trim();
};

const normalizeNumericValuesOrThrow = ({ values, expectedLength, field }) => {
  if (!Array.isArray(values) || values.length !== expectedLength) {
    throw createBadRequestError(
      `${field} must contain exactly ${expectedLength} numeric values.`,
      { field }
    );
  }

  const normalizedValues = values.map((item, index) => {
    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw createBadRequestError(`${field}[${index}] must be a finite number.`, {
        field: `${field}[${index}]`,
      });
    }

    if (item < 0 || item > 1) {
      throw createBadRequestError(`${field}[${index}] must be between 0 and 1.`, {
        field: `${field}[${index}]`,
      });
    }

    return item;
  });

  for (let index = 1; index < normalizedValues.length; index += 1) {
    if (normalizedValues[index] < normalizedValues[index - 1]) {
      throw createBadRequestError(`${field} must be non-decreasing.`, {
        field,
      });
    }
  }

  return normalizedValues;
};

export const normalizeLinguisticFuzzyCreationDefinition = (definition) => {
  const safeDefinition = assertPlainDefinitionOrThrow(definition);
  const membershipFunction = normalizeMembershipFunctionOrThrow(
    safeDefinition.membershipFunction
  );
  const labels = safeDefinition.labels;

  if (!Array.isArray(labels) || labels.length === 0) {
    throw createBadRequestError("definition.labels must be a non-empty array.", {
      field: "definition.labels",
    });
  }

  const expectedLength = MEMBERSHIP_FUNCTION_LENGTHS[membershipFunction];
  const seenKeys = new Set();

  const normalizedLabels = labels.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw createBadRequestError("Each definition.labels item must be an object.", {
        field: `definition.labels[${index}]`,
      });
    }

    const label = typeof item.label === "string" ? item.label.trim() : "";
    const key = isNonEmptyString(item.key)
      ? item.key.trim()
      : normalizeLabelKeyFromText(label);

    if (!isNonEmptyString(label)) {
      throw createBadRequestError("Each fuzzy label must be non-empty.", {
        field: `definition.labels[${index}].label`,
      });
    }

    if (!isNonEmptyString(key)) {
      throw createBadRequestError("Each fuzzy label key must be non-empty.", {
        field: `definition.labels[${index}].key`,
      });
    }

    if (seenKeys.has(key)) {
      throw createBadRequestError("Fuzzy label keys must be unique.", {
        field: `definition.labels[${index}].key`,
      });
    }
    seenKeys.add(key);

    return {
      key,
      label,
      values: normalizeNumericValuesOrThrow({
        values: item.values,
        expectedLength,
        field: `definition.labels[${index}].values`,
      }),
      index,
    };
  });

  return {
    membershipFunction,
    labelCount: normalizedLabels.length,
    labels: normalizedLabels,
  };
};
