import {
  getUniqueTrimmedStrings,
  normalizeEmail,
  normalizeOptionalString,
  normalizeString,
} from "../../../utils/common/strings.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeCriteriaNodesOrThrow = (criteriaNodes) => {
  return criteriaNodes.map((node) => {
    if (!isPlainObject(node)) {
      throw createBadRequestError("Each criterion must be an object", {
        field: "criteria",
      });
    }

    const name = normalizeString(node.name);
    if (!name) {
      throw createBadRequestError("Criterion name is required", {
        field: "criteria",
      });
    }

    const type = normalizeString(node.type);
    const rawChildren = node.children;

    if (rawChildren !== undefined && !Array.isArray(rawChildren)) {
      throw createBadRequestError("Criterion children must be an array", {
        field: "criteria",
      });
    }

    const children = normalizeCriteriaNodesOrThrow(rawChildren || []);

    return {
      name,
      type,
      children,
    };
  });
};

export const normalizeCreateIssueInput = (rawIssueInfo) => {
  if (rawIssueInfo === undefined || rawIssueInfo === null) {
    throw createBadRequestError("issueInfo is required", {
      field: "issueInfo",
    });
  }

  if (!isPlainObject(rawIssueInfo)) {
    throw createBadRequestError("issueInfo must be an object", {
      field: "issueInfo",
    });
  }

  const issueInfo = rawIssueInfo;

  const issueName = normalizeString(issueInfo.issueName);
  const issueDescription = normalizeOptionalString(issueInfo.issueDescription);
  const selectedModelId = normalizeString(issueInfo.selectedModelId);
  const alternatives = issueInfo.alternatives;
  const isConsensus = issueInfo.isConsensus === true;
  const hasSimulateConsensus = Object.prototype.hasOwnProperty.call(
    issueInfo,
    "simulateConsensus"
  );
  const simulateConsensus = hasSimulateConsensus
    ? issueInfo.simulateConsensus
    : false;
  const criteria = issueInfo.criteria;
  const addedExperts = issueInfo.addedExperts;
  const expressionDomainConfig = issueInfo.expressionDomainConfig;
  const closureDate = issueInfo.closureDate;
  const consensusMaxPhases = issueInfo.consensusMaxPhases;
  const consensusThreshold = issueInfo.consensusThreshold;
  const paramValues = issueInfo.paramValues;
  const criteriaWeightingConfig = issueInfo.criteriaWeightingConfig;
  const criteriaWeightingParameters = issueInfo.criteriaWeightingParameters;

  if (!issueName) {
    throw createBadRequestError("Issue name is required", {
      field: "issueName",
    });
  }

  if (!selectedModelId) {
    throw createBadRequestError("selectedModelId is required", {
      field: "selectedModelId",
    });
  }

  if (hasSimulateConsensus && typeof simulateConsensus !== "boolean") {
    throw createBadRequestError("simulateConsensus must be a boolean", {
      field: "simulateConsensus",
      code: "INVALID_SIMULATE_CONSENSUS",
    });
  }

  if (!isValidObjectIdLike(selectedModelId)) {
    throw createBadRequestError("Valid selectedModelId is required", {
      field: "selectedModelId",
    });
  }

  if (!Array.isArray(alternatives)) {
    throw createBadRequestError("alternatives must be an array", {
      field: "alternatives",
    });
  }

  if (!Array.isArray(addedExperts)) {
    throw createBadRequestError("addedExperts must be an array", {
      field: "addedExperts",
    });
  }

  if (!Array.isArray(criteria)) {
    throw createBadRequestError("criteria must be an array", {
      field: "criteria",
    });
  }

  const uniqueAlternativeNames = getUniqueTrimmedStrings(alternatives);
  if (uniqueAlternativeNames.length <= 1) {
    throw createBadRequestError("Must be at least two valid alternatives", {
      field: "alternatives",
    });
  }

  const uniqueExpertEmails = Array.from(new Set(addedExperts.map(normalizeEmail).filter(Boolean)));

  if (uniqueExpertEmails.length === 0) {
    throw createBadRequestError("Must be at least one expert", {
      field: "addedExperts",
    });
  }

  if (criteria.length === 0) {
    throw createBadRequestError("At least one criterion is required", {
      field: "criteria",
    });
  }

  const normalizedCriteria = normalizeCriteriaNodesOrThrow(criteria);

  if (!isPlainObject(expressionDomainConfig)) {
    throw createBadRequestError("expressionDomainConfig is required", {
      field: "expressionDomainConfig",
    });
  }

  if (paramValues !== undefined && !isPlainObject(paramValues)) {
    throw createBadRequestError("paramValues must be an object", {
      field: "paramValues",
    });
  }

  if (
    criteriaWeightingParameters !== undefined &&
    !isPlainObject(criteriaWeightingParameters)
  ) {
    throw createBadRequestError("criteriaWeightingParameters must be an object", {
      field: "criteriaWeightingParameters",
    });
  }

  const mode = normalizeString(expressionDomainConfig.mode);
  if (mode !== "global" && mode !== "byCriterion") {
    throw createBadRequestError("expressionDomainConfig.mode must be 'global' or 'byCriterion'", {
      field: "expressionDomainConfig",
    });
  }

  const normalizedExpressionDomainConfig =
    mode === "global"
      ? {
        mode,
        globalDomainId: normalizeString(expressionDomainConfig.globalDomainId),
      }
      : {
        mode,
        domainsByCriterion: isPlainObject(expressionDomainConfig.domainsByCriterion)
          ? Object.fromEntries(
            Object.entries(expressionDomainConfig.domainsByCriterion).map(
              ([criterionName, domainId]) => [
                normalizeString(criterionName),
                normalizeString(domainId),
              ]
            )
          )
          : null,
      };

  if (mode === "byCriterion" && !normalizedExpressionDomainConfig.domainsByCriterion) {
    throw createBadRequestError("expressionDomainConfig.domainsByCriterion is required", {
      field: "expressionDomainConfig",
    });
  }

  return {
    issueName,
    issueDescription,
    selectedModelId,
    uniqueAlternativeNames,
    isConsensus,
    simulateConsensus,
    criteria: normalizedCriteria,
    uniqueExpertEmails,
    expressionDomainConfig: normalizedExpressionDomainConfig,
    closureDate,
    consensusMaxPhases,
    consensusThreshold,
    paramValues: paramValues ?? {},
    criteriaWeightingConfig,
    criteriaWeightingParameters: criteriaWeightingParameters ?? {},
  };
};
