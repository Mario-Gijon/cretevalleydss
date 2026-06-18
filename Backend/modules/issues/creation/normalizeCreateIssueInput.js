import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { hasOwnKey, isPlainObject } from "../../../utils/common/objects.js";

const normalizeWhitespace = (value) => value.trim().replace(/\s+/g, " ");

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

const normalizeCriteriaNodesOrThrow = (criteriaNodes) => {
  return criteriaNodes.map((node) => {
    if (!isPlainObject(node)) {
      throw createBadRequestError("Each criterion must be an object", {
        field: "criteria",
      });
    }

    const name = requireNonEmptyStringOrThrow({
      value: node.name,
      field: "criteria",
      message: "Criterion name is required",
    });
    const type = requireNonEmptyStringOrThrow({
      value: node.type,
      field: "criteria",
      message: "Criterion type is required",
    });
    const rawChildren = node.children;

    if (rawChildren !== undefined && !Array.isArray(rawChildren)) {
      throw createBadRequestError("Criterion children must be an array", {
        field: "criteria",
      });
    }

    const children = normalizeCriteriaNodesOrThrow(
      rawChildren === undefined ? [] : rawChildren
    );

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

  const issueName = requireNonEmptyStringOrThrow({
    value: issueInfo.issueName,
    field: "issueName",
    message: "Issue name is required",
  });
  const issueDescription = normalizeOptionalStringOrThrow({
    value: issueInfo.issueDescription,
    field: "issueDescription",
    message: "issueDescription must be a string",
  });
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

  const uniqueAlternativeNames = normalizeUniqueStringArrayOrThrow({
    values: alternatives,
    field: "alternatives",
    itemMessage: "Each alternative must be a string",
  });
  if (uniqueAlternativeNames.length <= 1) {
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
    uniqueAlternativeNames,
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
