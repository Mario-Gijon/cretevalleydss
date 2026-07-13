import { getExpressionDomainTypeOrThrow } from "./expressionDomainTypeCatalog.js";
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

export const normalizeExpressionDomainCreationPayload = (payload) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("Expression domain payload must be an object", {
      field: "payload",
    });
  }

  const typeKey = requireNonEmptyStringOrThrow({
    value: payload.typeKey,
    field: "typeKey",
    message: "typeKey is required",
  });
  const domainType = getExpressionDomainTypeOrThrow(typeKey);

  return domainType.validateCreation(payload);
};

export const normalizeNewExpressionDomainPayload = (payload) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("Expression domain payload must be an object", {
      field: "payload",
    });
  }

  if (payload.isGlobal === true) {
    throw createForbiddenError(
      "Global domains are not creatable. They are predefined and non-modifiable."
    );
  }

  if (payload.isGlobal !== undefined && payload.isGlobal !== false) {
    throw createBadRequestError("isGlobal must be false when provided", {
      field: "isGlobal",
    });
  }

  return normalizeExpressionDomainCreationPayload(payload);
};
