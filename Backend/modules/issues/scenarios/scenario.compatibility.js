import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

const normalizeEndpointPath = (value) => {
  const normalizedPath = value.trim();
  if (!normalizedPath) return null;

  const clean = normalizedPath.replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}` : null;
};

export const buildTargetModelRuntimeSnapshotOrThrow = (targetModel) => {
  const targetApiModelKey = targetModel.apiModelKey.trim();
  const endpointPath = normalizeEndpointPath(targetModel.apiEndpoint.path);
  const targetInputKind = targetModel.inputKind.trim();
  const targetOutputKind = targetModel.outputKind.trim();
  const targetEvaluationStructure = targetModel.evaluationStructure.trim();
  const targetLifecycleKind = targetModel.lifecycleKind.trim();
  const targetModelFamilyKey = targetModel.modelFamilyKey.trim();
  const targetModelVersion = targetModel.modelVersion.trim();
  const targetVersionLabel = targetModel.versionLabel.trim();

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
      method: targetModel.apiEndpoint.method,
      path: endpointPath,
      operationId: targetModel.apiEndpoint.operationId,
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
  name: targetModelName,
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
  const issueEvaluationStructure = issue.evaluationStructure.trim();
  const issueInputKind = issue.inputKind.trim();
  const targetEvaluationStructure = targetRuntimeSnapshot.targetEvaluationStructure;
  const targetInputKind = targetRuntimeSnapshot.targetInputKind;

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
