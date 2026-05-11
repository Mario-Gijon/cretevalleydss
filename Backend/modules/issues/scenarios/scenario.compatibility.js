import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

const normalizeEndpointPath = (value) => {
  const normalizedPath = String(value || "").trim();
  if (!normalizedPath) return null;

  const clean = normalizedPath.replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}` : null;
};

export const buildTargetModelRuntimeSnapshotOrThrow = (targetModel) => {
  const targetApiModelKey = String(targetModel?.apiModelKey || "").trim();
  const endpointPath = normalizeEndpointPath(targetModel?.apiEndpoint?.path);
  const targetApiInputFormat = String(targetModel?.apiInputFormat || "").trim();
  const targetApiOutputFormat = String(targetModel?.apiOutputFormat || "").trim();
  const targetEvaluationStructure = String(targetModel?.evaluationStructure || "").trim();
  const targetLifecycleKind = String(targetModel?.lifecycleKind || "").trim();
  const targetModelFamilyKey = String(targetModel?.modelFamilyKey || "").trim();
  const targetModelVersion = String(targetModel?.modelVersion || "").trim();
  const targetVersionLabel = String(targetModel?.versionLabel || "").trim();

  const missingFields = [];

  if (!targetApiModelKey) missingFields.push("apiModelKey");
  if (!endpointPath) missingFields.push("apiEndpoint.path");
  if (!targetApiInputFormat) missingFields.push("apiInputFormat");
  if (!targetApiOutputFormat) missingFields.push("apiOutputFormat");
  if (!targetEvaluationStructure) missingFields.push("evaluationStructure");
  if (!targetLifecycleKind) missingFields.push("lifecycleKind");
  if (!targetModelFamilyKey) missingFields.push("modelFamilyKey");
  if (!targetModelVersion) missingFields.push("modelVersion");
  if (!targetVersionLabel) missingFields.push("versionLabel");

  if (missingFields.length > 0) {
    throw createInternalError(
      "Target model runtime metadata is invalid for scenario execution",
      {
        field: "targetModelId",
        details: {
          missingFields,
          targetModelId: toIdString(targetModel._id),
        },
      }
    );
  }

  return {
    targetApiModelKey,
    targetApiEndpoint: {
      method: targetModel?.apiEndpoint?.method || null,
      path: endpointPath,
      operationId: targetModel?.apiEndpoint?.operationId || null,
    },
    targetApiInputFormat,
    targetApiOutputFormat,
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
  name: targetModelName,
  apiModelKey: targetRuntimeSnapshot.targetApiModelKey,
  apiEndpoint: { ...targetRuntimeSnapshot.targetApiEndpoint },
  apiInputFormat: targetRuntimeSnapshot.targetApiInputFormat,
  apiOutputFormat: targetRuntimeSnapshot.targetApiOutputFormat,
  evaluationStructure: targetRuntimeSnapshot.targetEvaluationStructure,
  lifecycleKind: targetRuntimeSnapshot.targetLifecycleKind,
  modelFamilyKey: targetRuntimeSnapshot.targetModelFamilyKey,
  modelVersion: targetRuntimeSnapshot.targetModelVersion,
  versionLabel: targetRuntimeSnapshot.targetVersionLabel,
});

const resolveCriteriaWeightsKind = (modelDoc) => {
  const parameters = modelDoc.parameters;
  const weightsParameter = parameters.find(
    (parameter) => parameter.semanticRole.trim() === "criteriaWeights"
  );

  if (!weightsParameter) {
    return null;
  }

  const weightsType = weightsParameter.type.trim();
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
  const issueEvaluationStructure = String(issue?.evaluationStructure || "").trim();
  const issueApiInputFormat = String(issue?.apiInputFormat || "").trim();
  const targetEvaluationStructure = targetRuntimeSnapshot.targetEvaluationStructure;
  const targetApiInputFormat = targetRuntimeSnapshot.targetApiInputFormat;

  if (targetEvaluationStructure !== issueEvaluationStructure) {
    throw createBadRequestError(
      "Incompatible models: evaluation structure does not match this issue input type.",
      {
        field: "targetModel",
      }
    );
  }

  if (targetApiInputFormat !== issueApiInputFormat) {
    throw createBadRequestError(
      "Incompatible models: target model apiInputFormat does not match this issue apiInputFormat.",
      {
        field: "targetModel",
      }
    );
  }

  const sourceWeightsKind = resolveCriteriaWeightsKind(issue.model);
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
