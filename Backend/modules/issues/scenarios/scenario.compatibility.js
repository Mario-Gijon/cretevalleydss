import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STRUCTURE_KEYS } from "../evaluations/evaluation.constants.js";

const normalizeEndpointPath = (value) => {
  const normalizedPath = String(value || "").trim();
  if (!normalizedPath) return null;

  const clean = normalizedPath.replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}` : null;
};

export const buildTargetModelRuntimeSnapshotOrThrow = (targetModel) => {
  const targetApiModelKey = String(targetModel?.apiModelKey || "").trim();
  const endpointPath = normalizeEndpointPath(targetModel?.apiEndpoint?.path);
  const targetAlternativeEvaluationStructureKey = String(
    targetModel?.alternativeEvaluationStructureKey || ""
  ).trim();
  const targetCriteriaWeightingStructureKey =
    targetModel?.criteriaWeightingStructureKey == null
      ? null
      : String(targetModel.criteriaWeightingStructureKey).trim() || null;
  const targetSupportsConsensus = targetModel?.supportsConsensus === true;
  const targetModelFamilyKey = String(targetModel?.modelFamilyKey || "").trim();
  const targetModelVersion = String(targetModel?.modelVersion || "").trim();
  const targetVersionLabel = String(targetModel?.versionLabel || "").trim();

  const missingFields = [];

  if (!targetApiModelKey) missingFields.push("apiModelKey");
  if (!endpointPath) missingFields.push("apiEndpoint.path");
  if (!targetAlternativeEvaluationStructureKey) {
    missingFields.push("alternativeEvaluationStructureKey");
  }
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
          targetModelId: toIdString(targetModel?._id),
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
    targetAlternativeEvaluationStructureKey,
    targetCriteriaWeightingStructureKey,
    targetSupportsConsensus,
    targetModelFamilyKey,
    targetModelVersion,
    targetVersionLabel,
  };
};

export const validateScenarioModelCompatibilityOrThrow = ({
  issue,
  targetRuntimeSnapshot,
}) => {
  if (issue?.currentStage !== "finished") {
    throw createBadRequestError(
      "Scenario model runs are only supported for finished issues",
      {
        field: "currentStage",
      }
    );
  }

  if (issue?.active !== false) {
    throw createBadRequestError(
      "Scenario model runs are only supported for inactive issues",
      {
        field: "active",
      }
    );
  }

  if (issue?.isConsensus === true) {
    throw createBadRequestError(
      "Consensus scenarios are not implemented for plugin model runs",
      {
        field: "isConsensus",
      }
    );
  }

  const issueAlternativeEvaluationStructureKey = String(
    issue?.alternativeEvaluationStructureKey || ""
  ).trim();

  if (
    issueAlternativeEvaluationStructureKey !==
    EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_CRITERIA_MATRIX
  ) {
    throw createBadRequestError(
      "Only alternativeCriteriaMatrix scenarios are supported in this phase",
      {
        field: "alternativeEvaluationStructureKey",
        details: {
          alternativeEvaluationStructureKey: issueAlternativeEvaluationStructureKey || null,
        },
      }
    );
  }

  if (
    targetRuntimeSnapshot.targetAlternativeEvaluationStructureKey !==
    issueAlternativeEvaluationStructureKey
  ) {
    throw createBadRequestError(
      "Incompatible model: alternative evaluation structure does not match this issue",
      {
        field: "targetModelId",
        details: {
          issueAlternativeEvaluationStructureKey,
          targetAlternativeEvaluationStructureKey:
            targetRuntimeSnapshot.targetAlternativeEvaluationStructureKey,
        },
      }
    );
  }
};
