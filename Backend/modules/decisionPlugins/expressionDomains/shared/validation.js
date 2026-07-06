import { createBadRequestError } from "../../../../utils/common/errors.js";

export const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

export const normalizeExpressionDomainNameOrThrow = (value) => {
  if (!isNonEmptyString(value)) {
    throw createBadRequestError("Expression domain name is required.", {
      field: "name",
    });
  }

  return value.trim();
};

export const assertPlainDefinitionOrThrow = (
  value,
  {
    message = "definition must be an object.",
    field = "definition",
  } = {}
) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw createBadRequestError(message, { field });
  }

  return value;
};

export const normalizeFiniteNumberOrThrow = (
  value,
  {
    message = "Value must be a finite number.",
    field = "value",
  } = {}
) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw createBadRequestError(message, { field });
  }

  return value;
};

export const getExpressionDomainDefinitionOrThrow = (
  expressionDomain,
  {
    message = "Expression domain definition is invalid.",
    field = "definition",
  } = {}
) =>
  assertPlainDefinitionOrThrow(expressionDomain?.definition, {
    message,
    field,
  });
