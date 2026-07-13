import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { hasOwnKey, isPlainObject } from "../../../utils/common/objects.js";
import {
  ALTERNATIVE_DESCRIPTION_MAX_LENGTH,
  ALTERNATIVE_NAME_MAX_LENGTH,
  CRITERION_DESCRIPTION_MAX_LENGTH,
  CRITERION_NAME_MAX_LENGTH,
  ISSUE_DESCRIPTION_MAX_LENGTH,
  ISSUE_NAME_MAX_LENGTH,
} from "../shared/entityLimits.js";

const normalizeWhitespace = (value) => value.trim().replace(/\s+/g, " ");

const normalizeDescriptionOrThrow = ({ value, field, maxLength }) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw createBadRequestError(`${field} must be a string`, { field });
  }

  const normalizedValue = value.replace(/\r\n?/g, "\n").trim();
  if (normalizedValue === "") return null;
  if (normalizedValue.length > maxLength) {
    throw createBadRequestError(`${field} must be at most ${maxLength} characters`, {
      field,
    });
  }

  return normalizedValue;
};

const requireNonEmptyStringOrThrow = ({ value, field, message }) => {
  if (typeof value !== "string") {
    throw createBadRequestError(message, {
      field,
    });
  }

  const normalizedValue = normalizeWhitespace(value);
  if (!normalizedValue) {
    throw createBadRequestError(message, {
      field,
    });
  }

  return normalizedValue;
};

const normalizeOptionalStringOrThrow = ({ value, field, message }) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw createBadRequestError(message, {
      field,
    });
  }

  const normalizedValue = normalizeWhitespace(value);
  return normalizedValue === "" ? null : normalizedValue;
};

const normalizeOptionalCriterionIdOrThrow = ({ value, field }) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw createBadRequestError("Criterion id must be a string when provided", {
      field,
    });
  }

  const normalizedValue = normalizeWhitespace(value);
  return normalizedValue === "" ? null : normalizedValue;
};

const normalizeUniqueStringArrayOrThrow = ({
  values,
  field,
  itemMessage,
  lower = false,
}) => {
  const uniqueValues = [];
  const seenValues = new Set();

  for (const value of values) {
    if (typeof value !== "string") {
      throw createBadRequestError(itemMessage, {
        field,
      });
    }

    let normalizedValue = normalizeWhitespace(value);
    if (lower) {
      normalizedValue = normalizedValue.toLowerCase();
    }

    if (!normalizedValue || seenValues.has(normalizedValue)) {
      continue;
    }

    seenValues.add(normalizedValue);
    uniqueValues.push(normalizedValue);
  }

  return uniqueValues;
};

const normalizeExpertSelectionsOrThrow = (values) => {
  const uniqueExpertEmails = [];
  const seenEmails = new Set();
  let expertWeightsByEmail = null;

  for (const value of values) {
    if (typeof value === "string") {
      const normalizedEmail = normalizeWhitespace(value).toLowerCase();

      if (!normalizedEmail || seenEmails.has(normalizedEmail)) {
        continue;
      }

      seenEmails.add(normalizedEmail);
      uniqueExpertEmails.push(normalizedEmail);
      continue;
    }

    if (!isPlainObject(value)) {
      throw createBadRequestError("Each expert must be a string or an object", {
        field: "addedExperts",
      });
    }

    const normalizedEmail = requireNonEmptyStringOrThrow({
      value: value.email,
      field: "addedExperts",
      message: "Each expert email is required",
    }).toLowerCase();
    const weight = Number(value.weight);

    if (!Number.isFinite(weight)) {
      throw createBadRequestError("Expert weights are required for this model.", {
        field: "addedExperts",
      });
    }

    if (expertWeightsByEmail === null) {
      expertWeightsByEmail = {};
    }

    expertWeightsByEmail[normalizedEmail] = weight;

    if (seenEmails.has(normalizedEmail)) {
      continue;
    }

    seenEmails.add(normalizedEmail);
    uniqueExpertEmails.push(normalizedEmail);
  }

  return {
    uniqueExpertEmails,
    expertWeightsByEmail,
  };
};

const normalizeCriteriaNodesOrThrow = (criteriaNodes, field = "criteria") => {
  return criteriaNodes.map((node, index) => {
    const nodeField = `${field}[${index}]`;
    if (!isPlainObject(node)) {
      throw createBadRequestError("Each criterion must be an object", {
        field: nodeField,
      });
    }

    const name = requireNonEmptyStringOrThrow({
      value: node.name,
      field: `${nodeField}.name`,
      message: "Criterion name is required",
    });
    if (name.length > CRITERION_NAME_MAX_LENGTH) {
      throw createBadRequestError(
        `Criterion name must be at most ${CRITERION_NAME_MAX_LENGTH} characters`,
        { field: `${nodeField}.name` }
      );
    }
    const type = requireNonEmptyStringOrThrow({
      value: node.type,
      field: `${nodeField}.type`,
      message: "Criterion type is required",
    });
    const rawChildren = node.children;

    if (rawChildren !== undefined && !Array.isArray(rawChildren)) {
      throw createBadRequestError("Criterion children must be an array", {
        field: `${nodeField}.children`,
      });
    }

    const children = normalizeCriteriaNodesOrThrow(
      rawChildren === undefined ? [] : rawChildren,
      `${nodeField}.children`
    );

    return {
      id: normalizeOptionalCriterionIdOrThrow({
        value: node.id,
        field: `${nodeField}.id`,
      }),
      name,
      description: normalizeDescriptionOrThrow({
        value: node.description,
        field: `${nodeField}.description`,
        maxLength: CRITERION_DESCRIPTION_MAX_LENGTH,
      }),
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

  const issueName = requireNonEmptyStringOrThrow({
    value: issueInfo.issueName,
    field: "issueName",
    message: "Issue name is required",
  });
  if (issueName.length > ISSUE_NAME_MAX_LENGTH) {
    throw createBadRequestError(`Issue name must be at most ${ISSUE_NAME_MAX_LENGTH} characters`, {
      field: "issueName",
    });
  }
  const issueDescription = normalizeDescriptionOrThrow({
    value: issueInfo.issueDescription,
    field: "issueDescription",
    maxLength: ISSUE_DESCRIPTION_MAX_LENGTH,
  });
  if (!issueDescription) {
    throw createBadRequestError("issueDescription is required", {
      field: "issueDescription",
    });
  }
  const selectedModelId = requireNonEmptyStringOrThrow({
    value: issueInfo.selectedModelId,
    field: "selectedModelId",
    message: "selectedModelId is required",
  });
  const alternatives = issueInfo.alternatives;
  const hasIsConsensus = hasOwnKey(issueInfo, "isConsensus");
  const isConsensus = hasIsConsensus ? issueInfo.isConsensus : false;
  const hasSimulateConsensus = hasOwnKey(issueInfo, "simulateConsensus");
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

  if (hasIsConsensus && typeof isConsensus !== "boolean") {
    throw createBadRequestError("isConsensus must be a boolean", {
      field: "isConsensus",
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

  const normalizedAlternatives = [];
  const alternativeNames = new Set();
  alternatives.forEach((alternative, index) => {
    const field = `alternatives[${index}]`;
    if (!isPlainObject(alternative)) {
      throw createBadRequestError("Each alternative must be an object", { field });
    }
    const name = requireNonEmptyStringOrThrow({
      value: alternative.name,
      field: `${field}.name`,
      message: "Alternative name is required",
    });
    if (name.length > ALTERNATIVE_NAME_MAX_LENGTH) {
      throw createBadRequestError(
        `Alternative name must be at most ${ALTERNATIVE_NAME_MAX_LENGTH} characters`,
        { field: `${field}.name` }
      );
    }
    if (alternativeNames.has(name)) return;
    alternativeNames.add(name);
    normalizedAlternatives.push({
      name,
      description: normalizeDescriptionOrThrow({
        value: alternative.description,
        field: `${field}.description`,
        maxLength: ALTERNATIVE_DESCRIPTION_MAX_LENGTH,
      }),
    });
  });
  if (normalizedAlternatives.length <= 1) {
    throw createBadRequestError("Must be at least two valid alternatives", {
      field: "alternatives",
    });
  }

  const { uniqueExpertEmails, expertWeightsByEmail } =
    normalizeExpertSelectionsOrThrow(addedExperts);

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

  const mode = requireNonEmptyStringOrThrow({
    value: expressionDomainConfig.mode,
    field: "expressionDomainConfig.mode",
    message: "expressionDomainConfig.mode must be 'global' or 'byCriterion'",
  });
  if (mode !== "global" && mode !== "byCriterion") {
    throw createBadRequestError("expressionDomainConfig.mode must be 'global' or 'byCriterion'", {
      field: "expressionDomainConfig",
    });
  }

  const normalizedExpressionDomainConfig =
    mode === "global"
      ? {
        mode,
        globalDomainId: requireNonEmptyStringOrThrow({
          value: expressionDomainConfig.globalDomainId,
          field: "expressionDomainConfig.globalDomainId",
          message: "expressionDomainConfig.globalDomainId is required",
        }),
      }
      : {
        mode,
        domainsByCriterion: isPlainObject(expressionDomainConfig.domainsByCriterion)
          ? Object.fromEntries(
            Object.entries(expressionDomainConfig.domainsByCriterion).map(
              ([criterionName, domainId]) => [
                requireNonEmptyStringOrThrow({
                  value: criterionName,
                  field: "expressionDomainConfig.domainsByCriterion",
                  message:
                    "expressionDomainConfig.domainsByCriterion contains an invalid criterion name",
                }),
                requireNonEmptyStringOrThrow({
                  value: domainId,
                  field: "expressionDomainConfig.domainsByCriterion",
                  message:
                    "expressionDomainConfig.domainsByCriterion contains an invalid domain id",
                }),
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
    normalizedAlternatives,
    isConsensus,
    simulateConsensus,
    criteria: normalizedCriteria,
    uniqueExpertEmails,
    expressionDomainConfig: normalizedExpressionDomainConfig,
    closureDate,
    consensusMaxPhases,
    consensusThreshold,
    paramValues: paramValues === undefined ? {} : paramValues,
    criteriaWeightingConfig,
    criteriaWeightingParameters:
      criteriaWeightingParameters === undefined
        ? {}
        : criteriaWeightingParameters,
    expertWeightsByEmail,
  };
};
