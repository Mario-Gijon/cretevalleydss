import { createBadRequestError } from "../../../utils/common/errors.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

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

export const validateIssueModelRuntimeConfigOrThrow = (model) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const runtimeErrors = [];

  const apiModelKey = normalizeApiModelKey(model?.apiModelKey);
  if (!apiModelKey) {
    runtimeErrors.push({
      field: "apiModelKey",
      message: "must be a non-empty string",
      value: model?.apiModelKey,
    });
  }

  const endpointPath = normalizeEndpointPath(model?.apiEndpoint?.path);
  if (!endpointPath) {
    runtimeErrors.push({
      field: "apiEndpoint.path",
      message: "must be a non-empty string",
      value: model?.apiEndpoint?.path,
    });
  }

  const alternativeEvaluationStructureKey = normalizeNonEmptyString(
    model?.alternativeEvaluationStructureKey
  );
  if (!alternativeEvaluationStructureKey) {
    runtimeErrors.push({
      field: "alternativeEvaluationStructureKey",
      message: "is required",
      value: model?.alternativeEvaluationStructureKey,
    });
  }

  if (typeof model?.supportsConsensus !== "boolean") {
    runtimeErrors.push({
      field: "supportsConsensus",
      message: "must be boolean",
      value: model?.supportsConsensus,
    });
  }
  if (typeof model?.supportsConsensusSimulation !== "boolean") {
    runtimeErrors.push({
      field: "supportsConsensusSimulation",
      message: "must be boolean",
      value: model?.supportsConsensusSimulation,
    });
  }
  if (typeof model?.usesCriteriaWeights !== "boolean") {
    runtimeErrors.push({
      field: "usesCriteriaWeights",
      message: "must be boolean",
      value: model?.usesCriteriaWeights,
    });
  }
  if (typeof model?.usesFuzzyCriteriaWeights !== "boolean") {
    runtimeErrors.push({
      field: "usesFuzzyCriteriaWeights",
      message: "must be boolean",
      value: model?.usesFuzzyCriteriaWeights,
    });
  }
  if (typeof model?.usesCriterionTypes !== "boolean") {
    runtimeErrors.push({
      field: "usesCriterionTypes",
      message: "must be boolean",
      value: model?.usesCriterionTypes,
    });
  }
  if (typeof model?.isMultiCriteria !== "boolean") {
    runtimeErrors.push({
      field: "isMultiCriteria",
      message: "must be boolean",
      value: model?.isMultiCriteria,
    });
  }

  const modelFamilyKey = normalizeNonEmptyString(model?.modelFamilyKey);
  if (!modelFamilyKey) {
    runtimeErrors.push({
      field: "modelFamilyKey",
      message: "must be a non-empty string",
      value: model?.modelFamilyKey,
    });
  }

  const modelVersion = normalizeNonEmptyString(model?.modelVersion);
  if (!modelVersion) {
    runtimeErrors.push({
      field: "modelVersion",
      message: "must be a non-empty string",
      value: model?.modelVersion,
    });
  }

  const versionLabel = normalizeNonEmptyString(model?.versionLabel);
  if (!versionLabel) {
    runtimeErrors.push({
      field: "versionLabel",
      message: "must be a non-empty string",
      value: model?.versionLabel,
    });
  }

  if (runtimeErrors.length > 0) {
    const firstError = runtimeErrors[0];
    const fieldSummary = runtimeErrors
      .map((error) => `${error.field} ${error.message}`)
      .join(", ");

    throw createBadRequestError(
      `Selected model '${modelName}' is missing required runtime configuration: ${fieldSummary}`,
      {
        field: `selectedModel.${firstError.field}`,
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
      method: normalizeNonEmptyString(model?.apiEndpoint?.method) || null,
      path: endpointPath,
      operationId: normalizeNonEmptyString(model?.apiEndpoint?.operationId) || null,
    },
    alternativeEvaluationStructureKey,
    supportsConsensus: model.supportsConsensus,
    supportsConsensusSimulation: model.supportsConsensusSimulation,
    usesCriteriaWeights: model.usesCriteriaWeights,
    usesFuzzyCriteriaWeights: model.usesFuzzyCriteriaWeights,
    usesCriterionTypes: model.usesCriterionTypes,
    isMultiCriteria: model.isMultiCriteria,
    modelFamilyKey,
    modelVersion,
    versionLabel,
  };
};
