import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import {
  isDomainSnapshotSupportedByModel,
  resolveSupportedDomainFlags,
} from "../../expressionDomains/domainCompatibility.js";

const normalizeEndpointPath = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedPath = value.trim();
  if (!normalizedPath) {
    return null;
  }

  const clean = normalizedPath.replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}` : null;
};

const getRequiredTrimmedRuntimeString = ({ targetModel, field, value }) => {
  if (typeof value !== "string") {
    throw createInternalError(
      "Target model runtime metadata is invalid for scenario execution",
      {
        field: "targetModelId",
        details: {
          missingFields: [field],
          targetModelId: toIdString(targetModel._id),
        },
      }
    );
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    throw createInternalError(
      "Target model runtime metadata is invalid for scenario execution",
      {
        field: "targetModelId",
        details: {
          missingFields: [field],
          targetModelId: toIdString(targetModel._id),
        },
      }
    );
  }

  return normalizedValue;
};

export const buildTargetModelRuntimeSnapshotOrThrow = (targetModel) => {
  const apiEndpoint = targetModel.apiEndpoint;
  if (!apiEndpoint || typeof apiEndpoint !== "object") {
    throw createInternalError(
      "Target model runtime metadata is invalid for scenario execution",
      {
        field: "targetModelId",
        details: {
          missingFields: ["apiEndpoint"],
          targetModelId: toIdString(targetModel._id),
        },
      }
    );
  }

  const targetApiModelKey = getRequiredTrimmedRuntimeString({
    targetModel,
    field: "apiModelKey",
    value: targetModel.apiModelKey,
  });
  const endpointPath = normalizeEndpointPath(apiEndpoint.path);
  const targetEvaluationStructureKey =
    getRequiredTrimmedRuntimeString({
      targetModel,
      field: "evaluationStructureKey",
      value: targetModel.evaluationStructureKey,
    });
  const targetSupportsConsensus = targetModel.supportsConsensus;
  const targetUsesCriteriaWeights = targetModel.usesCriteriaWeights;
  const targetUsesFuzzyCriteriaWeights =
    targetModel.usesFuzzyCriteriaWeights;
  const targetUsesCriterionTypes = targetModel.usesCriterionTypes;
  const targetIsMultiCriteria = targetModel.isMultiCriteria;

  if (!endpointPath) {
    throw createInternalError(
      "Target model runtime metadata is invalid for scenario execution",
      {
        field: "targetModelId",
        details: {
          missingFields: ["apiEndpoint.path"],
          targetModelId: toIdString(targetModel._id),
        },
      }
    );
  }

  return {
    targetApiModelKey,
    targetApiEndpoint: {
      method: apiEndpoint.method,
      path: endpointPath,
    },
    targetEvaluationStructureKey,
    targetSupportsConsensus,
    targetUsesCriteriaWeights,
    targetUsesFuzzyCriteriaWeights,
    targetUsesCriterionTypes,
    targetIsMultiCriteria,
  };
};

export const getUnsupportedIssueDomainsForModel = ({
  issueDomainSnapshots,
  modelSupportedDomains,
}) => {
  const supportedDomainFlags = resolveSupportedDomainFlags(modelSupportedDomains);

  return issueDomainSnapshots.filter(
    (domainSnapshot) =>
      !isDomainSnapshotSupportedByModel({
        domainSnapshot,
        supportedDomainFlags,
      })
  );
};

const buildConsensusModeMatches = ({ issue, targetSupportsConsensus }) => {
  if (issue.isConsensus === true) {
    return targetSupportsConsensus === true;
  }
  return targetSupportsConsensus !== true;
};

export const buildScenarioCompatibilityMetadata = ({
  issue,
  targetModel,
  issueDomainSnapshots,
}) => {
  const issueAlternativeEvaluationStructureKey =
    issue.evaluationStructureKey;
  const targetEvaluationStructureKey =
    targetModel.evaluationStructureKey;
  const targetSupportsConsensus = targetModel.supportsConsensus;

  const structureMatches =
    targetEvaluationStructureKey ===
    issueAlternativeEvaluationStructureKey;
  const consensusModeMatches = buildConsensusModeMatches({
    issue,
    targetSupportsConsensus,
  });
  const unsupportedDomains = getUnsupportedIssueDomainsForModel({
    issueDomainSnapshots,
    modelSupportedDomains: targetModel.supportedDomains,
  });
  const domainsMatch = unsupportedDomains.length === 0;
  const targetModelId = toIdString(targetModel._id);
  const issueModelId = toIdString(issue.model._id || issue.model);
  const sameModel = targetModelId === issueModelId;

  const reasons = [];
  if (!structureMatches) {
    reasons.push("Alternative evaluation structure does not match the issue");
  }
  if (!consensusModeMatches) {
    reasons.push("Consensus mode does not match the issue");
  }
  if (!domainsMatch) {
    reasons.push("Expression domains used by the issue are not supported");
  }

  return {
    compatible: structureMatches && domainsMatch && consensusModeMatches,
    reasons,
    structureMatches,
    domainsMatch,
    consensusModeMatches,
    sameModel,
    unsupportedDomains: unsupportedDomains.map((domainSnapshot) => ({
      id: toIdString(domainSnapshot._id),
      name: domainSnapshot.name,
      type: domainSnapshot.type,
      membershipFunction: domainSnapshot.membershipFunction,
    })),
  };
};

export const validateScenarioModelCompatibilityOrThrow = ({
  issue,
  targetRuntimeSnapshot,
  issueDomainSnapshots,
  targetModel,
  targetModelSupportedDomains,
}) => {
  if (issue.currentStage !== "finished") {
    throw createBadRequestError(
      "Scenario model runs are only supported for finished issues",
      {
        field: "currentStage",
      }
    );
  }

  if (issue.active !== false) {
    throw createBadRequestError(
      "Scenario model runs are only supported for inactive issues",
      {
        field: "active",
      }
    );
  }

  const compatibility = buildScenarioCompatibilityMetadata({
    issue,
    targetModel: {
      ...targetModel,
      evaluationStructureKey:
        targetRuntimeSnapshot.targetEvaluationStructureKey,
      supportsConsensus: targetRuntimeSnapshot.targetSupportsConsensus,
      supportedDomains: targetModelSupportedDomains,
    },
    issueDomainSnapshots,
  });

  if (!compatibility.compatible) {
    throw createBadRequestError(
      "Incompatible model for this scenario issue",
      {
        field: "targetModelId",
        details: {
          scenarioCompatibility: {
            compatible: compatibility.compatible,
            reasons: compatibility.reasons,
            structureMatches: compatibility.structureMatches,
            domainsMatch: compatibility.domainsMatch,
            consensusModeMatches: compatibility.consensusModeMatches,
            sameModel: compatibility.sameModel,
          },
          unsupportedDomains: compatibility.unsupportedDomains,
        },
      }
    );
  }
};
