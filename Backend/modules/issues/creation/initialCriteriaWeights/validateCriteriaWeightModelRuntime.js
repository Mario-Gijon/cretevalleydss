import { createBadRequestError } from "../../../../utils/common/errors.js";
import { normalizeNonEmptyString } from "../../../../utils/common/strings.js";

const normalizeEndpointPath = (value) => {
  const path = normalizeNonEmptyString(value);
  if (!path) {
    return null;
  }

  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  return normalizedPath ? `/${normalizedPath}` : null;
};

const normalizeApiModelKey = (value) => {
  const key = normalizeNonEmptyString(value);
  if (!key) {
    return null;
  }

  const normalizedKey = key.replace(/^\/+|\/+$/g, "");
  return normalizedKey || null;
};

const pushRuntimeErrorIfMissingString = ({
  runtimeErrors,
  field,
  value,
  message = "must be a non-empty string",
}) => {
  const normalizedValue = normalizeNonEmptyString(value);

  if (!normalizedValue) {
    runtimeErrors.push({
      field,
      message,
      value,
    });
  }

  return normalizedValue;
};

export const validateCriteriaWeightingModelRuntimeConfigOrThrow = (model) => {
  const modelName = normalizeNonEmptyString(model.name) || "unknown";
  const runtimeErrors = [];
  const apiEndpoint = model.apiEndpoint;

  if (model.isCriteriaWeightingModel !== true) {
    runtimeErrors.push({
      field: "isCriteriaWeightingModel",
      message: "must be true",
      value: model.isCriteriaWeightingModel,
    });
  }

  const apiModelKey = normalizeApiModelKey(model.apiModelKey);
  if (!apiModelKey) {
    runtimeErrors.push({
      field: "apiModelKey",
      message: "must be a non-empty string",
      value: model.apiModelKey,
    });
  }

  const endpointPath = apiEndpoint
    ? normalizeEndpointPath(apiEndpoint.path)
    : null;
  if (!endpointPath) {
    runtimeErrors.push({
      field: "apiEndpoint.path",
      message: "must be a non-empty string",
      value: apiEndpoint ? apiEndpoint.path : undefined,
    });
  }

  const criteriaWeightingStructureKey = pushRuntimeErrorIfMissingString({
    runtimeErrors,
    field: "criteriaWeightingStructureKey",
    message: "is required",
    value: model.criteriaWeightingStructureKey,
  });
  const supportsCreatorCriteriaWeighting =
    model.supportsCreatorCriteriaWeighting;
  const supportsExpertCriteriaWeighting =
    model.supportsExpertCriteriaWeighting;

  if (typeof supportsCreatorCriteriaWeighting !== "boolean") {
    runtimeErrors.push({
      field: "supportsCreatorCriteriaWeighting",
      message: "must be boolean",
      value: supportsCreatorCriteriaWeighting,
    });
  }

  if (typeof supportsExpertCriteriaWeighting !== "boolean") {
    runtimeErrors.push({
      field: "supportsExpertCriteriaWeighting",
      message: "must be boolean",
      value: supportsExpertCriteriaWeighting,
    });
  }

  if (runtimeErrors.length > 0) {
    const firstError = runtimeErrors[0];
    const fieldSummary = runtimeErrors
      .map((error) => `${error.field} ${error.message}`)
      .join(", ");

    throw createBadRequestError(
      `Selected criteria weighting model '${modelName}' is missing required runtime configuration: ${fieldSummary}`,
      {
        field: `criteriaWeightingModel.${firstError.field}`,
        details: {
          model: modelName,
          missingOrInvalidFields: runtimeErrors,
        },
      }
    );
  }

  return {
    apiModelKey,
    apiEndpoint: {
      method: apiEndpoint ? normalizeNonEmptyString(apiEndpoint.method) : null,
      path: endpointPath,
    },
    criteriaWeightingStructureKey,
    supportsCreatorCriteriaWeighting,
    supportsExpertCriteriaWeighting,
  };
};
