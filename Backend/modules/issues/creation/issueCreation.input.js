import {
  getUniqueTrimmedStrings,
  normalizeEmail,
  normalizeOptionalString,
  normalizeString,
} from "../../../utils/common/strings.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

/**
 * Normaliza y valida la entrada base para crear un issue.
 *
 * @param {Object} rawIssueInfo Datos recibidos en req.body.issueInfo.
 * @returns {Object}
 */
export const normalizeCreateIssueInput = (rawIssueInfo) => {
  const issueInfo = rawIssueInfo || {};

  const issueName = normalizeString(issueInfo.issueName);
  const issueDescription = normalizeOptionalString(issueInfo.issueDescription);
  const selectedModelId = normalizeString(issueInfo.selectedModelId);
  const alternatives = Array.isArray(issueInfo.alternatives)
    ? issueInfo.alternatives
    : [];
  const isConsensus = issueInfo.isConsensus === true;
  const criteria = Array.isArray(issueInfo.criteria) ? issueInfo.criteria : [];
  const addedExperts = Array.isArray(issueInfo.addedExperts)
    ? issueInfo.addedExperts
    : [];
  const expressionDomainConfig = issueInfo.expressionDomainConfig;
  const closureDate = issueInfo.closureDate;
  const consensusMaxPhases = issueInfo.consensusMaxPhases;
  const consensusThreshold = issueInfo.consensusThreshold;
  const paramValues = issueInfo.paramValues || {};
  const criteriaWeightingConfig = issueInfo.criteriaWeightingConfig;
  const criteriaWeightingParameters =
    issueInfo.criteriaWeightingParameters &&
    typeof issueInfo.criteriaWeightingParameters === "object" &&
    !Array.isArray(issueInfo.criteriaWeightingParameters)
      ? issueInfo.criteriaWeightingParameters
      : {};

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

  if (!isValidObjectIdLike(selectedModelId)) {
    throw createBadRequestError("Valid selectedModelId is required", {
      field: "selectedModelId",
    });
  }

  const uniqueAlternativeNames = getUniqueTrimmedStrings(alternatives);
  if (uniqueAlternativeNames.length <= 1) {
    throw createBadRequestError("Must be at least two valid alternatives", {
      field: "alternatives",
    });
  }

  const uniqueExpertEmails = Array.from(
    new Set((addedExperts || []).map(normalizeEmail).filter(Boolean))
  );

  if (uniqueExpertEmails.length === 0) {
    throw createBadRequestError("Must be at least one expert", {
      field: "addedExperts",
    });
  }

  if (!criteria.length) {
    throw createBadRequestError("At least one criterion is required", {
      field: "criteria",
    });
  }

  if (!expressionDomainConfig || typeof expressionDomainConfig !== "object") {
    throw createBadRequestError("expressionDomainConfig is required", {
      field: "expressionDomainConfig",
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
        domainsByCriterion:
            expressionDomainConfig.domainsByCriterion &&
            typeof expressionDomainConfig.domainsByCriterion === "object" &&
            !Array.isArray(expressionDomainConfig.domainsByCriterion)
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

  return {
    issueName,
    issueDescription,
    selectedModelId,
    uniqueAlternativeNames,
    isConsensus,
    criteria,
    uniqueExpertEmails,
    expressionDomainConfig: normalizedExpressionDomainConfig,
    closureDate,
    consensusMaxPhases,
    consensusThreshold,
    paramValues,
    criteriaWeightingConfig,
    criteriaWeightingParameters,
  };
};
