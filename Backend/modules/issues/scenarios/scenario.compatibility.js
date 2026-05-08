import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeEndpointPath = (value) => {
  const normalizedPath = normalizeNonEmptyString(value);
  if (!normalizedPath) return null;

  const clean = normalizedPath.replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}` : null;
};

export const buildTargetModelRuntimeSnapshotOrThrow = (targetModel) => {
  const targetApiModelKey = normalizeNonEmptyString(targetModel?.apiModelKey);
  const endpointPath = normalizeEndpointPath(targetModel?.apiEndpoint?.path);
  const targetInputKind = normalizeNonEmptyString(targetModel?.inputKind);
  const targetOutputKind = normalizeNonEmptyString(targetModel?.outputKind);
  const targetEvaluationStructure = normalizeNonEmptyString(
    targetModel?.evaluationStructure
  );
  const targetLifecycleKind = normalizeNonEmptyString(targetModel?.lifecycleKind);
  const targetModelFamilyKey = normalizeNonEmptyString(targetModel?.modelFamilyKey);
  const targetModelVersion = normalizeNonEmptyString(targetModel?.modelVersion);
  const targetVersionLabel = normalizeNonEmptyString(targetModel?.versionLabel);

  const missingFields = [];

  if (!targetApiModelKey) missingFields.push("apiModelKey");
  if (!endpointPath) missingFields.push("apiEndpoint.path");
  if (!targetInputKind) missingFields.push("inputKind");
  if (!targetOutputKind) missingFields.push("outputKind");
  if (!targetEvaluationStructure) missingFields.push("evaluationStructure");
  if (!targetLifecycleKind) missingFields.push("lifecycleKind");
  if (!targetModelFamilyKey) missingFields.push("modelFamilyKey");
  if (!targetModelVersion) missingFields.push("modelVersion");
  if (!targetVersionLabel) missingFields.push("versionLabel");

  if (missingFields.length > 0) {
    throw createBadRequestError(
      "Target model runtime metadata is invalid for scenario execution",
      {
        field: "targetModelId",
        details: {
          missingFields,
          targetModelId: toIdString(targetModel?._id),
        },
      }
    );
  }

  return {
    targetApiModelKey,
    targetApiEndpoint: {
      method: normalizeNonEmptyString(targetModel?.apiEndpoint?.method) ?? null,
      path: endpointPath,
      operationId:
        normalizeNonEmptyString(targetModel?.apiEndpoint?.operationId) ?? null,
    },
    targetInputKind,
    targetOutputKind,
    targetEvaluationStructure,
    targetLifecycleKind,
    targetModelFamilyKey,
    targetModelVersion,
    targetVersionLabel,
  };
};

export const buildTargetRuntimeModelFromSnapshot = ({
  targetModelName,
  targetRuntimeSnapshot,
}) => ({
  name: targetModelName || "unknown",
  apiModelKey: targetRuntimeSnapshot.targetApiModelKey,
  apiEndpoint: { ...targetRuntimeSnapshot.targetApiEndpoint },
  inputKind: targetRuntimeSnapshot.targetInputKind,
  outputKind: targetRuntimeSnapshot.targetOutputKind,
  evaluationStructure: targetRuntimeSnapshot.targetEvaluationStructure,
  lifecycleKind: targetRuntimeSnapshot.targetLifecycleKind,
  modelFamilyKey: targetRuntimeSnapshot.targetModelFamilyKey,
  modelVersion: targetRuntimeSnapshot.targetModelVersion,
  versionLabel: targetRuntimeSnapshot.targetVersionLabel,
});

const resolveCriteriaWeightsKind = (modelDoc) => {
  const parameters = Array.isArray(modelDoc?.parameters) ? modelDoc.parameters : [];
  const weightsParameter = parameters.find(
    (parameter) => normalizeNonEmptyString(parameter?.semanticRole) === "criteriaWeights"
  );

  const weightsType = normalizeNonEmptyString(weightsParameter?.type);
  if (weightsType === "fuzzyArray") {
    return "fuzzy";
  }

  if (weightsType === "array") {
    return "crisp";
  }

  return null;
};

export const validateScenarioModelCompatibilityOrThrow = ({
  issue,
  targetModel,
  targetRuntimeSnapshot,
}) => {
  const issueEvaluationStructure = normalizeNonEmptyString(issue?.evaluationStructure);
  const issueInputKind = normalizeNonEmptyString(issue?.inputKind);
  const targetEvaluationStructure =
    targetRuntimeSnapshot?.targetEvaluationStructure ?? null;
  const targetInputKind = targetRuntimeSnapshot?.targetInputKind ?? null;

  if (targetEvaluationStructure !== issueEvaluationStructure) {
    throw createBadRequestError(
      "Incompatible models: evaluation structure does not match this issue input type.",
      {
        field: "targetModel",
      }
    );
  }

  if (targetInputKind !== issueInputKind) {
    throw createBadRequestError(
      "Incompatible models: target model input kind does not match this issue input kind.",
      {
        field: "targetModel",
      }
    );
  }

  const sourceWeightsKind = resolveCriteriaWeightsKind(issue?.model);
  const targetWeightsKind = resolveCriteriaWeightsKind(targetModel);
  if (
    sourceWeightsKind &&
    targetWeightsKind &&
    sourceWeightsKind !== targetWeightsKind
  ) {
    throw createBadRequestError(
      "Incompatible models: target model criteria weights kind does not match this issue model.",
      {
        field: "targetModel",
      }
    );
  }
};
