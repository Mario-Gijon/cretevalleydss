import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";

export const validatePayloadShape = ({ payload }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("AHP payload must be an object", {
      field: "payload",
    });
  }
  if (
    Object.keys(payload).length !== 1 ||
    !Object.hasOwn(payload, "comparisons") ||
    !Array.isArray(payload.comparisons)
  ) {
    throw createBadRequestError(
      "AHP payload must contain exactly a comparisons array",
      { field: "payload.comparisons" }
    );
  }
};
