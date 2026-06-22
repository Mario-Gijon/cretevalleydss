import { IssueModel } from "../../../models/IssueModels.js";
import { User } from "../../../models/Users.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../decisionPlugins/modelParameters/index.js";
import {
  validateIssueModelRuntimeConfigOrThrow,
} from "./validateIssueModelRuntime.js";
import { normalizeEmail } from "../../../utils/common/strings.js";
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
}) => {
  const existingModel = await IssueModel.findById(selectedModelId).session(session);

  if (!existingModel) {
    throw createBadRequestError("Model does not exist", {
      field: "selectedModelId",
    });
  }

  if (existingModel.isIssueModel !== true || existingModel.publicUsable === false) {
    throw createBadRequestError("Selected model is not public usable", {
      field: "selectedModelId",
    });
  }

  const {
    apiModelKey,
    apiEndpoint,
    alternativeEvaluationStructureKey,
    supportsConsensus,
    supportsConsensusSimulation,
    usesCriteriaWeights,
    usesExpertWeights,
    isMultiCriteria,
  } = validateIssueModelRuntimeConfigOrThrow(existingModel);

  const sanitizedParamValues = stripCriteriaWeightParameterValues(paramValues);

  const normalizedModelParameters = validateAndNormalizeModelParametersOrThrow({
    model: existingModel,
    paramValues: sanitizedParamValues,
    criteriaNodes,
    alternatives,
  });
  const normalizedModelParametersWithoutCriteriaWeights =
    stripCriteriaWeightParameterValues(normalizedModelParameters);

  const owner = await User.findById(ownerUserId).session(session);
  if (!owner) {
    throw createNotFoundError("Owner not found");
  }

  const expertUsers = await User.find({
    email: { $in: uniqueExpertEmails },
  }).session(session);

  const expertByEmail = new Map(
    expertUsers.map((user) => [normalizeEmail(user.email), user])
  );

  const missingExperts = uniqueExpertEmails.filter(
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
    alternativeEvaluationStructureKey,
    supportsConsensus,
    supportsConsensusSimulation,
    usesCriteriaWeights,
    usesExpertWeights,
    isMultiCriteria,
    normalizedModelParameters:
      normalizedModelParametersWithoutCriteriaWeights,
  };
};
