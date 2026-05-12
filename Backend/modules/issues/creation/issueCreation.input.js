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
  const domainAssignments = issueInfo.domainAssignments;
  const closureDate = issueInfo.closureDate;
  const consensusMaxPhases = issueInfo.consensusMaxPhases;
  const consensusThreshold = issueInfo.consensusThreshold;
  const paramValues = issueInfo.paramValues || {};
  const criteriaWeightingConfig = issueInfo.criteriaWeightingConfig;

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

  if (
    !domainAssignments ||
    typeof domainAssignments !== "object" ||
    !domainAssignments.experts ||
    typeof domainAssignments.experts !== "object"
  ) {
    throw createBadRequestError("domainAssignments.experts is required", {
      field: "domainAssignments",
    });
  }

  const normalizedAssignmentsByExpert = Object.fromEntries(
    Object.entries(domainAssignments.experts).map(([email, value]) => [
      normalizeEmail(email),
      value,
    ])
  );

  return {
    issueName,
    issueDescription,
    selectedModelId,
    uniqueAlternativeNames,
    isConsensus,
    criteria,
    uniqueExpertEmails,
    normalizedAssignmentsByExpert,
    closureDate,
    consensusMaxPhases,
    consensusThreshold,
    paramValues,
    criteriaWeightingConfig,
  };
};
