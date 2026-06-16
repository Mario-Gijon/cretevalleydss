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
import { toIdString } from "../../../utils/common/ids.js";

const stripCriteriaWeightParameterValues = (paramValues) => {
  const normalized = { ...paramValues };

  delete normalized.weights;

  return normalized;
};

export const loadCreateIssueActorsAndModel = async ({
  adminUserId,
  selectedModelId,
  paramValues,
  criteriaNodes,
  alternativesCount,
  uniqueExpertEmails,
  session = null,
}) => {
  const existingModel = await IssueModel.findById(selectedModelId).session(session);

  if (!existingModel) {
    throw createBadRequestError("Model does not exist", {
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
    isMultiCriteria,
  } = validateIssueModelRuntimeConfigOrThrow(existingModel);

  const sanitizedParamValues = stripCriteriaWeightParameterValues(paramValues);

  const admin = await User.findById(adminUserId).session(session);
  if (!admin) {
    throw createNotFoundError("Admin not found");
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

  const normalizedModelParameters = validateAndNormalizeModelParametersOrThrow({
    model: existingModel,
    paramValues: sanitizedParamValues,
    criteriaNodes,
    alternativesCount,
    selectedExperts: uniqueExpertEmails
      .map((email) => expertByEmail.get(email))
      .filter(Boolean)
      .map((expert) => ({
        id: toIdString(expert?._id),
        name: expert?.name || null,
        email: normalizeEmail(expert?.email),
      })),
  });
  const normalizedModelParametersWithoutCriteriaWeights =
    stripCriteriaWeightParameterValues(normalizedModelParameters);

  return {
    model: existingModel,
    admin,
    adminEmail: normalizeEmail(admin.email),
    expertByEmail,
    apiModelKey,
    apiEndpoint,
    alternativeEvaluationStructureKey,
    supportsConsensus,
    supportsConsensusSimulation,
    usesCriteriaWeights,
    isMultiCriteria,
    normalizedModelParameters:
      normalizedModelParametersWithoutCriteriaWeights,
  };
};
