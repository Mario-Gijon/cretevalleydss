import { IssueModel } from "../../../models/IssueModels.js";
import { User } from "../../../models/Users.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../modelParameters/validateAndNormalizeModelParameters.js";
import { MODEL_PARAMETER_STRUCTURE_REGISTRY } from "../../decisionPlugins/modelParameters/parameterStructureRegistry.js";
import {
  validateIssueModelRuntimeConfigOrThrow,
} from "./validateIssueModelRuntime.js";
import { normalizeEmail } from "../../../utils/common/strings.js";
import { AHPSORT_I_API_MODEL_KEY } from "../modelExecution/validateAHPSortIExecutionEvaluations.js";
import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";

const stripCriteriaWeightParameterValues = (paramValues) => {
  const normalized = { ...paramValues };

  delete normalized.weights;

  return normalized;
};

export const loadCreateIssueActorsAndModel = async ({
  ownerUserId,
  selectedModelId,
  paramValues,
  criteriaNodes,
  alternatives,
  uniqueExpertEmails,
  session = null,
  deferModelParameterValidation = false,
  availableValidationContextKeys = [],
}) => {
  const normalizedExpertEmails = [
    ...new Set(uniqueExpertEmails.map((email) => normalizeEmail(email)).filter(Boolean)),
  ];

  if (normalizedExpertEmails.length === 0) {
    throw createBadRequestError("Must be at least one expert", {
      field: "addedExperts",
    });
  }

  const existingModel = await IssueModel.findById(selectedModelId).session(session);

  if (!existingModel) {
    throw createBadRequestError("Model does not exist", {
      field: "selectedModelId",
    });
  }

  if (
    existingModel.modelKind !== "issue" ||
    existingModel.visibleInIssueCreation === false ||
    existingModel?.manifestSync?.isStale === true
  ) {
    throw createBadRequestError("Selected model is not enabled for issue creation", {
      field: "selectedModelId",
    });
  }

  const {
    apiModelKey,
    apiEndpoint,
    evaluationStructureKey,
    resultStructureKey,
    resultStructureVersion,
    supportsConsensus,
    supportsConsensusSimulation,
    usesCriteriaWeights,
    usesExpertWeights,
    isMultiCriteria,
    requiresHomogeneousExpressionDomains,
  } = validateIssueModelRuntimeConfigOrThrow(existingModel);

  if (apiModelKey === AHPSORT_I_API_MODEL_KEY && normalizedExpertEmails.length !== 1) {
    throw createBadRequestError(
      "AHPSort I requires exactly one expert. Remove additional experts before creating the issue.",
      {
        code: "AHPSORT_I_SINGLE_EXPERT_REQUIRED",
        field: "addedExperts",
        details: {
          expectedExpertCount: 1,
          receivedExpertCount: normalizedExpertEmails.length,
        },
      }
    );
  }

  const sanitizedParamValues = stripCriteriaWeightParameterValues(paramValues);
  const availableContextKeys = new Set(availableValidationContextKeys);
  const hasUnavailableValidationContext = (
    Array.isArray(existingModel.parameters) ? existingModel.parameters : []
  ).some((parameter) => {
    const structure = MODEL_PARAMETER_STRUCTURE_REGISTRY.get(
      parameter?.parameterStructureKey
    );
    return (structure?.validationContextKeys || []).some(
      (contextKey) => !availableContextKeys.has(contextKey)
    );
  });
  const shouldDeferModelParameterValidation =
    deferModelParameterValidation && hasUnavailableValidationContext;

  const normalizedModelParameters = shouldDeferModelParameterValidation
    ? null
    : validateAndNormalizeModelParametersOrThrow({
        model: existingModel,
        paramValues: sanitizedParamValues,
        criteriaNodes,
        alternatives,
      });
  const normalizedModelParametersWithoutCriteriaWeights = shouldDeferModelParameterValidation
    ? null
    : stripCriteriaWeightParameterValues(normalizedModelParameters);

  const owner = await User.findById(ownerUserId).session(session);
  if (!owner) {
    throw createNotFoundError("Owner not found");
  }

  const expertUsers = await User.find({
    email: { $in: normalizedExpertEmails },
  }).session(session);

  const expertByEmail = new Map(
    expertUsers.map((user) => [normalizeEmail(user.email), user])
  );

  const missingExperts = normalizedExpertEmails.filter(
    (email) => !expertByEmail.has(email)
  );

  if (missingExperts.length > 0) {
    throw createBadRequestError(
      `Experts not found: ${missingExperts.join(", ")}`,
      {
        field: "addedExperts",
      }
    );
  }

  return {
    model: existingModel,
    owner,
    ownerEmail: normalizeEmail(owner.email),
    expertByEmail,
    apiModelKey,
    apiEndpoint,
    evaluationStructureKey,
    resultStructureKey,
    resultStructureVersion,
    supportsConsensus,
    supportsConsensusSimulation,
    usesCriteriaWeights,
    usesExpertWeights,
    isMultiCriteria,
    requiresHomogeneousExpressionDomains,
    normalizedModelParameters:
      normalizedModelParametersWithoutCriteriaWeights,
    ...(shouldDeferModelParameterValidation
      ? { modelParameterValuesToValidate: sanitizedParamValues }
      : {}),
  };
};
