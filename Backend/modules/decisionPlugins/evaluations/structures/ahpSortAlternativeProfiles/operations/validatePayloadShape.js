import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";

export const validatePayloadShape = ({ payload }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("AHPSort I evaluation payload must be an object", {
      field: "payload",
    });
  }

  const expectedFields = new Set([
    "alternativeProfileComparisons",
    "profileComparisons",
  ]);
  const unsupportedField = Object.keys(payload).find(
    (field) => !expectedFields.has(field)
  );
  if (unsupportedField) {
    throw createBadRequestError(
      `AHPSort I evaluation payload contains unsupported field '${unsupportedField}'`,
      { field: `payload.${unsupportedField}` }
    );
  }

  for (const field of expectedFields) {
    if (!Array.isArray(payload[field])) {
      throw createBadRequestError(`${field} must be an array`, {
        field: `payload.${field}`,
      });
    }
  }
};
