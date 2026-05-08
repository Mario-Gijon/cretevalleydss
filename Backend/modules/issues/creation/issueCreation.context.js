import { IssueModel } from "../../../models/IssueModels.js";
import { User } from "../../../models/Users.js";
import { validateAndNormalizeModelParametersOrThrow as validateAndNormalizeModelParametersSharedOrThrow } from "../modelParameters/index.js";
import {
  modelRequiresCriterionWeights,
  normalizeNonEmptyString,
  validateIssueConsensusCompatibilityOrThrow,
  validateIssueModelRuntimeConfigOrThrow,
} from "./issueCreation.model.js";
import { countLeafCriteriaNodes } from "../modelParameters/index.js";
import { normalizeEmail } from "../../../utils/common/strings.js";
import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";

/**
 * Carga y valida el modelo, admin y expertos para la creación del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.adminUserId Id del admin actual.
 * @param {string} params.selectedModelId Id del modelo elegido.
 * @param {boolean} params.requestedWithConsensus Indicador withConsensus recibido en la petición.
 * @param {string} params.weightingMode Modo de ponderación solicitado.
 * @param {Object} params.paramValues Parámetros del modelo recibidos en la petición.
 * @param {Array<Object>} params.criteriaNodes Criterios recibidos en la petición.
 * @param {string[]} params.uniqueExpertEmails Correos únicos de expertos.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const loadCreateIssueActorsAndModel = async ({
  adminUserId,
  selectedModelId,
  requestedWithConsensus,
  weightingMode,
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
    inputKind,
    outputKind,
    evaluationStructure: modelEvaluationStructure,
    lifecycleKind: modelLifecycleKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
  } = validateIssueModelRuntimeConfigOrThrow(existingModel);
  validateIssueConsensusCompatibilityOrThrow({
    requestedWithConsensus,
    model: existingModel,
    lifecycleKind: modelLifecycleKind,
  });

  const normalizedModelParameters = validateAndNormalizeModelParametersSharedOrThrow({
    model: existingModel,
    paramValues,
    criteriaNodes,
    alternativesCount,
  });

  const requiresCriterionWeights = modelRequiresCriterionWeights(existingModel);
  const leafCriteriaCount = countLeafCriteriaNodes(criteriaNodes);
  const normalizedWeightingMode = normalizeNonEmptyString(weightingMode);
  const hasNormalizedWeights = Array.isArray(normalizedModelParameters?.weights);

  if (
    normalizedWeightingMode === "manual" &&
    requiresCriterionWeights &&
    leafCriteriaCount > 1 &&
    !hasNormalizedWeights
  ) {
    throw createBadRequestError(
      "Manual weighting mode requires valid model parameter 'weights'",
      {
        field: "paramValues.weights",
        details: {
          weightingMode: normalizedWeightingMode,
          requiredByModel: true,
          leafCriteriaCount,
        },
      }
    );
  }

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
    modelEvaluationStructure,
    modelLifecycleKind,
    apiModelKey,
    apiEndpoint,
    inputKind,
    outputKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    normalizedModelParameters,
  };
};
