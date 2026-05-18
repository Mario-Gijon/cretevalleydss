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

const normalizeSupportedDomainFlags = (modelSupportedDomains) => ({
  numericContinuous: modelSupportedDomains?.numeric?.continuous === true,
  numericDiscrete: modelSupportedDomains?.numeric?.discrete === true,
  linguisticMembershipFunctions: Array.isArray(modelSupportedDomains?.linguistic)
    ? modelSupportedDomains.linguistic
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
    : [],
});

const isNumericDiscreteDomainSnapshot = (domainSnapshot) => {
  const step = domainSnapshot?.numericRange?.step;
  return Number.isFinite(step) && step > 0;
};

const isDomainSnapshotSupportedByModel = ({
  domainSnapshot,
  supportedDomainFlags,
}) => {
  if (domainSnapshot?.type === "numeric") {
    return isNumericDiscreteDomainSnapshot(domainSnapshot)
      ? supportedDomainFlags.numericDiscrete
      : supportedDomainFlags.numericContinuous;
  }

  if (domainSnapshot?.type === "linguistic") {
    const membershipFunction = String(domainSnapshot?.membershipFunction || "")
      .trim()
      .toLowerCase();
    return (
      membershipFunction.length > 0 &&
      supportedDomainFlags.linguisticMembershipFunctions.includes(membershipFunction)
    );
  }

  return false;
};

export const getUnsupportedIssueDomainsForModel = ({
  issueDomainSnapshots,
  modelSupportedDomains,
}) => {
  const supportedDomainFlags = normalizeSupportedDomainFlags(modelSupportedDomains);
  const domainSnapshots = Array.isArray(issueDomainSnapshots)
    ? issueDomainSnapshots
    : [];

  return domainSnapshots.filter(
    (domainSnapshot) =>
      !isDomainSnapshotSupportedByModel({
        domainSnapshot,
        supportedDomainFlags,
      })
  );
};

const buildConsensusModeMatches = ({ issue, targetSupportsConsensus }) => {
  if (issue?.isConsensus === true) {
    return targetSupportsConsensus === true;
  }
  return targetSupportsConsensus !== true;
};

export const buildScenarioCompatibilityMetadata = ({
  issue,
  targetModel,
  issueDomainSnapshots,
}) => {
  const issueAlternativeEvaluationStructureKey = String(
    issue?.alternativeEvaluationStructureKey || ""
  ).trim();
  const targetAlternativeEvaluationStructureKey = String(
    targetModel?.alternativeEvaluationStructureKey || ""
  ).trim();
  const targetSupportsConsensus = targetModel?.supportsConsensus === true;

  const structureMatches =
    targetAlternativeEvaluationStructureKey ===
    issueAlternativeEvaluationStructureKey;
  const consensusModeMatches = buildConsensusModeMatches({
    issue,
    targetSupportsConsensus,
  });
  const unsupportedDomains = getUnsupportedIssueDomainsForModel({
    issueDomainSnapshots,
    modelSupportedDomains: targetModel?.supportedDomains || null,
  });
  const domainsMatch = unsupportedDomains.length === 0;
  const targetModelId = toIdString(targetModel?._id);
  const issueModelId = toIdString(issue?.model?._id || issue?.model);
  const sameModel =
    Boolean(targetModelId && issueModelId && targetModelId === issueModelId);

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
      id: toIdString(domainSnapshot?._id),
      name: domainSnapshot?.name || null,
      type: domainSnapshot?.type || null,
      membershipFunction: domainSnapshot?.membershipFunction || null,
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

  const compatibility = buildScenarioCompatibilityMetadata({
    issue,
    targetModel: {
      ...targetModel,
      alternativeEvaluationStructureKey:
        targetRuntimeSnapshot?.targetAlternativeEvaluationStructureKey,
      supportsConsensus: targetRuntimeSnapshot?.targetSupportsConsensus === true,
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
