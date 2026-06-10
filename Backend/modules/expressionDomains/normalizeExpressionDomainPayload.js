import { getLinguisticMembershipFunctionOrThrow } from "./linguisticMembershipFunctions.js";
import {
  createBadRequestError,
  createForbiddenError,
} from "../../utils/common/errors.js";
import { isPlainObject } from "../../utils/common/objects.js";

const normalizeWhitespace = (value) => value.trim().replace(/\s+/g, " ");

const requireNonEmptyStringOrThrow = ({ value, field, message }) => {
  if (typeof value !== "string") {
    throw createBadRequestError(message, {
      field,
    });
  }

  const normalizedValue = normalizeWhitespace(value);
  if (!normalizedValue) {
    throw createBadRequestError(message, {
      field,
    });
  }

  return normalizedValue;
};

export const normalizeNewExpressionDomainPayload = (payload) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("Expression domain payload must be an object", {
      field: "payload",
    });
  }

  const {
    name,
    type,
    numericRange,
    membershipFunction,
    valuesMode,
    linguisticLabels,
    isGlobal,
  } = payload;
  const normalizedName = requireNonEmptyStringOrThrow({
    value: name,
    field: "name",
    message: "Name is required",
  });
  const normalizedType = requireNonEmptyStringOrThrow({
    value: type,
    field: "type",
    message: "Invalid type",
  });

  if (isGlobal === true) {
    throw createForbiddenError(
      "Global domains are not creatable. They are predefined and non-modifiable."
    );
  }

  if (isGlobal !== undefined && isGlobal !== false) {
    throw createBadRequestError("isGlobal must be false when provided", {
      field: "isGlobal",
    });
  }

  if (!["numeric", "linguistic"].includes(normalizedType)) {
    throw createBadRequestError("Invalid type", {
      field: "type",
    });
  }

  if (normalizedType === "numeric") {
    if (!isPlainObject(numericRange)) {
      throw createBadRequestError(
        "numericRange.min and numericRange.max are required for numeric domains",
        {
          field: "numericRange",
        }
      );
    }

    const { min, max, step: rawStep } = numericRange;
    if (min == null || max == null) {
      throw createBadRequestError(
        "numericRange.min and numericRange.max are required for numeric domains",
        {
          field: "numericRange",
        }
      );
    }

    const step =
      rawStep == null || rawStep === ""
        ? null
        : rawStep;

    if (
      typeof min !== "number" ||
      !Number.isFinite(min) ||
      typeof max !== "number" ||
      !Number.isFinite(max)
    ) {
      throw createBadRequestError("min/max must be numbers", {
        field: "numericRange",
      });
    }

    if (min >= max) {
      throw createBadRequestError("min must be < max", {
        field: "numericRange",
      });
    }

    if (
      step != null &&
      (typeof step !== "number" || !Number.isFinite(step) || step <= 0)
    ) {
      throw createBadRequestError("step must be null or a positive number", {
        field: "numericRange",
      });
    }

    return {
      name: normalizedName,
      type: normalizedType,
      numericRange: { min, max, step },
      membershipFunction: null,
      valueCount: null,
      valuesMode: null,
      linguisticLabels: [],
    };
  }

  const membershipDefinition = getLinguisticMembershipFunctionOrThrow({
    membershipFunction,
  });
  const derivedValueCount = membershipDefinition.valueCount;
  const normalizedValuesMode =
    valuesMode == null || valuesMode === ""
      ? "automatic"
      : requireNonEmptyStringOrThrow({
        value: valuesMode,
        field: "valuesMode",
        message: "valuesMode must be 'automatic' or 'custom'",
      });

  if (!["automatic", "custom"].includes(normalizedValuesMode)) {
    throw createBadRequestError("valuesMode must be 'automatic' or 'custom'", {
      field: "valuesMode",
    });
  }

  if (!Array.isArray(linguisticLabels) || linguisticLabels.length === 0) {
    throw createBadRequestError(
      "linguisticLabels is required for linguistic domains",
      {
        field: "linguisticLabels",
      }
    );
  }

  const seenLabels = new Set();

  const normalizedLabels = linguisticLabels.map((labelItem) => {
    if (!isPlainObject(labelItem)) {
      throw createBadRequestError("Each linguistic label must be an object", {
        field: "linguisticLabels",
      });
    }

    const label = requireNonEmptyStringOrThrow({
      value: labelItem.label,
      field: "linguisticLabels",
      message: "Label is required",
    });
    const values = labelItem.values;

    if (seenLabels.has(label)) {
      throw createBadRequestError(`Duplicated label '${label}'`, {
        field: "linguisticLabels",
      });
    }
    seenLabels.add(label);

    if (!Array.isArray(values) || values.length !== derivedValueCount) {
      throw createBadRequestError(
        `values must be an array with length ${derivedValueCount}`,
        {
          field: "linguisticLabels",
        }
      );
    }

    if (
      values.some(
        (value) => typeof value !== "number" || !Number.isFinite(value)
      )
    ) {
      throw createBadRequestError("values must be numbers", {
        field: "linguisticLabels",
      });
    }

    if (!values.every((item) => item >= 0 && item <= 1)) {
      throw createBadRequestError("values must be in range [0, 1]", {
        field: "linguisticLabels",
      });
    }

    for (let index = 1; index < values.length; index += 1) {
      if (values[index] < values[index - 1]) {
        throw createBadRequestError(
          "values must be ordered (non-decreasing)",
          {
            field: "linguisticLabels",
          }
        );
      }
    }

    return {
      label,
      values,
    };
  });

  return {
    name: normalizedName,
    type: normalizedType,
    numericRange: null,
    membershipFunction: membershipDefinition.key,
    valueCount: derivedValueCount,
    valuesMode: normalizedValuesMode,
    linguisticLabels: normalizedLabels,
  };
};
