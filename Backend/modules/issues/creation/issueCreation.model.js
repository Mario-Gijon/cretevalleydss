import { createBadRequestError } from "../../../utils/common/errors.js";

export const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeEndpointPath = (value) => {
  const path = normalizeNonEmptyString(value);
  if (!path) {
    return null;
  }

  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  return normalizedPath ? `/${normalizedPath}` : null;
};

export const normalizeApiModelKey = (value) => {
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
    supportsConsensus: model?.supportsConsensus === true,
    usesCriteriaWeights: model?.usesCriteriaWeights === true,
    usesFuzzyCriteriaWeights: model?.usesFuzzyCriteriaWeights === true,
    usesCriterionTypes: model?.usesCriterionTypes === true,
    isMultiCriteria: model?.isMultiCriteria === true,
    modelFamilyKey,
    modelVersion,
    versionLabel,
  };
};

export const validateCriteriaWeightingModelRuntimeConfigOrThrow = (model) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const runtimeErrors = [];

  if (model?.isCriteriaWeightingModel !== true) {
    runtimeErrors.push({
      field: "isCriteriaWeightingModel",
      message: "must be true",
      value: model?.isCriteriaWeightingModel,
    });
  }

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

  const criteriaWeightingStructureKey = normalizeNonEmptyString(
    model?.criteriaWeightingStructureKey
  );
  if (!criteriaWeightingStructureKey) {
    runtimeErrors.push({
      field: "criteriaWeightingStructureKey",
      message: "is required",
      value: model?.criteriaWeightingStructureKey,
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
      method: normalizeNonEmptyString(model?.apiEndpoint?.method) || null,
      path: endpointPath,
      operationId: normalizeNonEmptyString(model?.apiEndpoint?.operationId) || null,
    },
    criteriaWeightingStructureKey,
    modelFamilyKey,
    modelVersion,
    versionLabel,
  };
};

const normalizeFiniteNumber = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

export const resolveIssueConsensusConfigOrThrow = ({
  supportsConsensus,
  consensusThreshold,
  consensusMaxPhases,
}) => {
  const isConsensus = supportsConsensus === true;

  if (!isConsensus) {
    return {
      isConsensus: false,
      consensusThreshold: null,
      consensusMaxPhases: null,
    };
  }

  const normalizedThreshold = normalizeFiniteNumber(consensusThreshold);
  if (
    normalizedThreshold === null ||
    normalizedThreshold < 0 ||
    normalizedThreshold > 1
  ) {
    throw createBadRequestError(
      "consensusThreshold is required and must be a finite number between 0 and 1",
      {
        code: "INVALID_CONSENSUS_THRESHOLD",
        field: "consensusThreshold",
      }
    );
  }

  if (consensusMaxPhases === null || consensusMaxPhases === undefined) {
    return {
      isConsensus: true,
      consensusThreshold: normalizedThreshold,
      consensusMaxPhases: null,
    };
  }

  if (!Number.isInteger(consensusMaxPhases) || Number(consensusMaxPhases) <= 0) {
    throw createBadRequestError("consensusMaxPhases must be a positive integer", {
      code: "INVALID_CONSENSUS_MAX_PHASES",
      field: "consensusMaxPhases",
    });
  }

  return {
    isConsensus: true,
    consensusThreshold: normalizedThreshold,
    consensusMaxPhases,
  };
};
