import { getLinguisticMembershipFunctionOrThrow } from "./linguisticMembershipFunctions.js";
import {
  createBadRequestError,
  createForbiddenError,
} from "../../utils/common/errors.js";
import { normalizeString } from "../../utils/common/strings.js";

export const normalizeNewExpressionDomainPayload = (payload) => {
  let {
    name,
    type,
    numericRange,
    membershipFunction,
    valuesMode,
    linguisticLabels,
    isGlobal,
  } = payload || {};

  name = normalizeString(name);
  type = normalizeString(type);

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

  if (!name) {
    throw createBadRequestError("Name is required", {
      field: "name",
    });
  }

  if (!["numeric", "linguistic"].includes(type)) {
    throw createBadRequestError("Invalid type", {
      field: "type",
    });
  }

  if (type === "numeric") {
    if (!numericRange || numericRange.min == null || numericRange.max == null) {
      throw createBadRequestError(
        "numericRange.min and numericRange.max are required for numeric domains",
        {
          field: "numericRange",
        }
      );
    }

    const min = Number(numericRange.min);
    const max = Number(numericRange.max);
    const step =
      numericRange.step == null || numericRange.step === ""
        ? null
        : Number(numericRange.step);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw createBadRequestError("min/max must be numbers", {
        field: "numericRange",
      });
    }

    if (min >= max) {
      throw createBadRequestError("min must be < max", {
        field: "numericRange",
      });
    }

    if (step != null && (!Number.isFinite(step) || step <= 0)) {
      throw createBadRequestError("step must be null or a positive number", {
        field: "numericRange",
      });
    }

    return {
      name,
      type,
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
      : normalizeString(valuesMode);

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
    const label = normalizeString(labelItem?.label);
    const values = labelItem?.values;

    if (!label) {
      throw createBadRequestError("Label is required", {
        field: "linguisticLabels",
      });
    }

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

    const numericValues = values.map(Number);

    if (!numericValues.every(Number.isFinite)) {
      throw createBadRequestError("values must be numbers", {
        field: "linguisticLabels",
      });
    }

    if (!numericValues.every((item) => item >= 0 && item <= 1)) {
      throw createBadRequestError("values must be in range [0, 1]", {
        field: "linguisticLabels",
      });
    }

    for (let index = 1; index < numericValues.length; index += 1) {
      if (numericValues[index] < numericValues[index - 1]) {
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
      values: numericValues,
    };
  });

  return {
    name,
    type,
    numericRange: null,
    membershipFunction: membershipDefinition.key,
    valueCount: derivedValueCount,
    valuesMode: normalizedValuesMode,
    linguisticLabels: normalizedLabels,
  };
};
