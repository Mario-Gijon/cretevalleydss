import { IssueModel } from "../../../models/IssueModels.js";
import { User } from "../../../models/Users.js";
import { validateAndNormalizeModelParametersOrThrow as validateAndNormalizeModelParametersSharedOrThrow } from "../modelParameters/index.js";
import {
  validateIssueModelRuntimeConfigOrThrow,
} from "./issueCreation.model.js";
import { normalizeEmail } from "../../../utils/common/strings.js";
import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";

const stripCriteriaWeightParameterValues = ({ paramValues }) => {
  const rawParamValues =
    paramValues && typeof paramValues === "object" && !Array.isArray(paramValues)
      ? paramValues
      : {};
  const normalized = { ...rawParamValues };

  delete normalized.weights;

  return normalized;
};

/**
 * Carga y valida el modelo, admin y expertos para la creación del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.adminUserId Id del admin actual.
 * @param {string} params.selectedModelId Id del modelo elegido.
 * @param {Object} params.paramValues Parámetros del modelo recibidos en la petición.
 * @param {Array<Object>} params.criteriaNodes Criterios recibidos en la petición.
 * @param {string[]} params.uniqueExpertEmails Correos únicos de expertos.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const loadCreateIssueActorsAndModel = async ({
  adminUserId,
  selectedModelId,
  paramValues,
  criteriaNodes,
  alternativesCount,
  uniqueExpertEmails,
  session,
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
    usesCriteriaWeights,
    usesFuzzyCriteriaWeights,
    usesCriterionTypes,
    isMultiCriteria,
    modelFamilyKey,
    modelVersion,
    versionLabel,
  } = validateIssueModelRuntimeConfigOrThrow(existingModel);

  const sanitizedParamValues = stripCriteriaWeightParameterValues({ paramValues });

  const normalizedModelParameters = validateAndNormalizeModelParametersSharedOrThrow({
    model: existingModel,
    paramValues: sanitizedParamValues,
    criteriaNodes,
    alternativesCount,
  });
  const normalizedModelParametersWithoutCriteriaWeights =
    stripCriteriaWeightParameterValues({
      paramValues: normalizedModelParameters,
    });

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

  return {
    model: existingModel,
    admin,
    adminEmail: normalizeEmail(admin.email),
    expertUsers,
    expertByEmail,
    apiModelKey,
    apiEndpoint,
    alternativeEvaluationStructureKey,
    supportsConsensus,
    usesCriteriaWeights,
    usesFuzzyCriteriaWeights,
    usesCriterionTypes,
    isMultiCriteria,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    normalizedModelParameters:
      normalizedModelParametersWithoutCriteriaWeights,
  };
};
