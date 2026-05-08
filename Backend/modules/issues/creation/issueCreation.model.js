import {
  EVALUATION_STRUCTURES,
  validateEvaluationStructureOrThrow,
} from "../issue.evaluationStructure.js";
import {
  LIFECYCLE_KINDS,
  isSupportedLifecycleKind,
} from "../issue.lifecycleKind.js";
import { countLeafCriteriaNodes } from "../modelParameters/index.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

const SUPPORTED_EVALUATION_STRUCTURES = new Set(
  Object.values(EVALUATION_STRUCTURES)
);

const SUPPORTED_INPUT_KINDS = new Set([
  "directCrispMatrix",
  "directFuzzyMatrix",
  "pairwisePreferenceMatrix",
]);

const SUPPORTED_OUTPUT_KINDS = new Set([
  "ranking",
  "consensusRanking",
]);

const CONSENSUS_OUTPUT_KIND = "consensusRanking";
const SINGLE_PASS_OUTPUT_KIND = "ranking";

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

  const evaluationStructure = normalizeNonEmptyString(model?.evaluationStructure);
  if (!evaluationStructure) {
    runtimeErrors.push({
      field: "evaluationStructure",
      message: "is required",
      value: model?.evaluationStructure,
    });
  } else if (!SUPPORTED_EVALUATION_STRUCTURES.has(evaluationStructure)) {
    runtimeErrors.push({
      field: "evaluationStructure",
      message: `is unsupported: ${evaluationStructure}`,
      value: model?.evaluationStructure,
    });
  }

  const lifecycleKind = normalizeNonEmptyString(model?.lifecycleKind);
  if (!lifecycleKind) {
    runtimeErrors.push({
      field: "lifecycleKind",
      message: "is required",
      value: model?.lifecycleKind,
    });
  } else if (!isSupportedLifecycleKind(lifecycleKind)) {
    runtimeErrors.push({
      field: "lifecycleKind",
      message: `is unsupported: ${lifecycleKind}`,
      value: model?.lifecycleKind,
    });
  }

  const inputKind = normalizeNonEmptyString(model?.inputKind);
  if (!inputKind) {
    runtimeErrors.push({
      field: "inputKind",
      message: "is required",
      value: model?.inputKind,
    });
  } else if (!SUPPORTED_INPUT_KINDS.has(inputKind)) {
    runtimeErrors.push({
      field: "inputKind",
      message: `is unsupported: ${inputKind}`,
      value: model?.inputKind,
    });
  }

  const outputKind = normalizeNonEmptyString(model?.outputKind);
  if (!outputKind) {
    runtimeErrors.push({
      field: "outputKind",
      message: "is required",
      value: model?.outputKind,
    });
  } else if (!SUPPORTED_OUTPUT_KINDS.has(outputKind)) {
    runtimeErrors.push({
      field: "outputKind",
      message: `is unsupported: ${outputKind}`,
      value: model?.outputKind,
    });
  }

  if (typeof model?.isConsensus !== "boolean") {
    runtimeErrors.push({
      field: "isConsensus",
      message: "must be a boolean",
      value: model?.isConsensus,
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
    inputKind,
    outputKind,
    evaluationStructure: validateEvaluationStructureOrThrow(evaluationStructure),
    lifecycleKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
  };
};

export const validateIssueConsensusCompatibilityOrThrow = ({
  requestedWithConsensus,
  model,
  lifecycleKind,
}) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const modelIsConsensus = model?.isConsensus;
  const outputKind = normalizeNonEmptyString(model?.outputKind);
  const normalizedLifecycleKind = normalizeNonEmptyString(lifecycleKind);
  const incompatibilities = [];

  if (requestedWithConsensus !== modelIsConsensus) {
    incompatibilities.push(
      `withConsensus (${requestedWithConsensus}) must match model.isConsensus (${modelIsConsensus})`
    );
  }

  if (modelIsConsensus) {
    if (normalizedLifecycleKind !== LIFECYCLE_KINDS.THRESHOLD_CONSENSUS) {
      incompatibilities.push(
        `consensus model requires lifecycleKind '${LIFECYCLE_KINDS.THRESHOLD_CONSENSUS}'`
      );
    }

    if (outputKind !== CONSENSUS_OUTPUT_KIND) {
      incompatibilities.push(
        `consensus model requires outputKind '${CONSENSUS_OUTPUT_KIND}'`
      );
    }
  } else {
    if (normalizedLifecycleKind !== LIFECYCLE_KINDS.SINGLE_PASS) {
      incompatibilities.push(
        `non-consensus model requires lifecycleKind '${LIFECYCLE_KINDS.SINGLE_PASS}'`
      );
    }

    if (outputKind !== SINGLE_PASS_OUTPUT_KIND) {
      incompatibilities.push(
        `non-consensus model requires outputKind '${SINGLE_PASS_OUTPUT_KIND}'`
      );
    }
  }

  if (incompatibilities.length > 0) {
    throw createBadRequestError(
      `Requested consensus mode is incompatible with selected model '${modelName}': ${incompatibilities.join(", ")}`,
      {
        field: "withConsensus",
        details: {
          requestedWithConsensus,
          modelIsConsensus,
          outputKind: outputKind ?? null,
          lifecycleKind: normalizedLifecycleKind ?? null,
          incompatibilities,
        },
      }
    );
  }
};

export const modelRequiresCriterionWeights = (model) => {
  const parameters = Array.isArray(model?.parameters) ? model.parameters : [];

  return parameters.some((parameter) => {
    const parameterSemanticRole = normalizeNonEmptyString(
      parameter?.semanticRole
    );
    const parameterScope = normalizeNonEmptyString(parameter?.scope);
    const parameterType = normalizeNonEmptyString(parameter?.type);

    return (
      parameterSemanticRole === "criteriaWeights" &&
      parameterScope === "perCriterion" &&
      parameterType === "array" &&
      parameter?.required === true
    );
  });
};
