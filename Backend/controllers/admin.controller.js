import axios from "axios";
import mongoose from "mongoose";

// Models
import { Issue } from "../models/Issues.js";

// Modules
import {
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
} from "../modules/issues/issue.evaluationStructure.js";
import { editIssueExpertsFlow } from "../modules/issues/issue.experts.js";
import {
  computeBwmCollectiveWeightsFlow,
  computeManualCollectiveWeightsFlow,
} from "../modules/issues/issue.weights.js";
import {
  resolveDirectIssueFlow,
  resolvePairwiseIssueFlow,
} from "../modules/issues/issue.resolution.js";
import { deleteActiveIssueAsAdmin } from "../modules/issues/issue.lifecycle.js";

import {
  getAdminIssuesListPayload,
  getIssueAdminDetailPayload,
  getIssueExpertsProgressPayload,
  getIssueExpertEvaluationsPayload,
  getIssueExpertWeightsPayload,
} from "../modules/admin/admin.issueReads.js";

import {
  createUserAdminFlow,
  deleteUserAdminFlow,
  getAdminUsersListPayload,
  reassignIssueAdminFlow,
  updateUserAdminFlow,
} from "../modules/admin/admin.users.js";

// Utils
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../utils/common/errors.js";
import { toIdString } from "../utils/common/ids.js";
import {
  endSessionSafely,
  isValidObjectIdLike,
} from "../utils/common/mongoose.js";
import { sendSuccess } from "../utils/common/responses.js";

/**
 * @typedef {Object} AdminIssueExecutionContext
 * @property {Object} issue Issue cargado con su modelo.
 * @property {string} creatorUserId Id del creador del issue.
 */

/**
 * Obtiene el contexto necesario para ejecutar acciones de admin
 * sobre un issue reutilizando flows de dominio.
 *
 * @param {Object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<AdminIssueExecutionContext>}
 */
const getAdminIssueExecutionContextOrThrow = async ({
  issueId,
  session = null,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  let query = Issue.findById(issueId).populate("model");

  if (session) {
    query = query.session(session);
  }

  const issue = await query;

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return {
    issue,
    creatorUserId: toIdString(issue.admin),
  };
};

/**
 * Convierte un error de clave duplicada de MongoDB en AppError de conflicto.
 *
 * @param {unknown} error Error original.
 * @returns {never}
 */
const throwIfDuplicateEmailError = (error) => {
  if (error?.code === 11000) {
    throw createConflictError("Email already registered", {
      field: "email",
      details: error?.keyValue ?? null,
      cause: error,
    });
  }

  throw error;
};

/**
 * Obtiene todos los usuarios visibles desde el panel de administración.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const getAllUsersAdmin = async (req, res) => {
  const data = await getAdminUsersListPayload({
    adminUserId: req.uid,
    search: String(req.query.q || "").trim(),
    includeAdmins: req.query.includeAdmins === "true",
  });

  return sendSuccess(res, "Users fetched successfully", data);
};

/**
 * Crea un nuevo usuario desde el panel de administración.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const createUserAdmin = async (req, res) => {
  try {
    const result = await createUserAdminFlow({
      payload: req.body,
    });

    return sendSuccess(
      res,
      result.message,
      {
        user: result.user,
      },
      201
    );
  } catch (error) {
    throwIfDuplicateEmailError(error);
  }
};

/**
 * Actualiza un usuario desde el panel de administración.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const updateUserAdmin = async (req, res) => {
  try {
    const result = await updateUserAdminFlow({
      payload: req.body,
    });

    return sendSuccess(
      res,
      result.message,
      {
        user: result.user,
      },
    );
  } catch (error) {
    throwIfDuplicateEmailError(error);
  }
};

/**
 * Elimina un usuario desde el panel de administración.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const deleteUserAdmin = async (req, res) => {
  const { id } = req.body || {};

  if (!id || !isValidObjectIdLike(id)) {
    throw createBadRequestError("Valid user id is required", {
      field: "id",
    });
  }

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await deleteUserAdminFlow({
        targetUserId: id,
        adminUserId: req.uid,
        session,
      });
    });

    return sendSuccess(
      res,
      `User ${result.deletedUser.email} deleted successfully`,
      {
        deletedUser: result.deletedUser,
        summary: result.summary,
      },
    );
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Obtiene el listado resumido de issues para el panel de administración.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const getAllIssuesAdmin = async (req, res) => {
  const data = await getAdminIssuesListPayload({
    search: String(req.query.q || "").trim(),
    active: String(req.query.active || "all").trim().toLowerCase(),
    currentStage: String(req.query.currentStage || "all").trim(),
    isConsensus: String(req.query.isConsensus || "all").trim().toLowerCase(),
    adminId: String(req.query.adminId || "").trim(),
    modelId: String(req.query.modelId || "").trim(),
  });

  return sendSuccess(res, "Issues fetched successfully", data);
};

/**
 * Obtiene el detalle completo de un issue para administración.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const getIssueAdminById = async (req, res) => {
  const data = await getIssueAdminDetailPayload({
    issueId: req.params?.id,
  });

  return sendSuccess(res, "Issue detail fetched successfully", data);
};

/**
 * Obtiene una vista resumida del progreso de expertos en un issue.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const getIssueExpertsProgressAdmin = async (req, res) => {
  const data = await getIssueExpertsProgressPayload({
    issueId: req.params?.id,
  });

  return sendSuccess(
    res,
    "Issue experts progress fetched successfully",
    data,
  );
};

/**
 * Obtiene las evaluaciones de un experto en modo solo lectura.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const getIssueExpertEvaluationsAdmin = async (req, res) => {
  const data = await getIssueExpertEvaluationsPayload({
    issueId: req.params?.issueId,
    expertId: req.params?.expertId,
  });

  return sendSuccess(
    res,
    "Expert evaluations fetched successfully",
    data,
  );
};

/**
 * Obtiene los pesos de un experto en modo solo lectura.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const getIssueExpertWeightsAdmin = async (req, res) => {
  const data = await getIssueExpertWeightsPayload({
    issueId: req.params?.issueId,
    expertId: req.params?.expertId,
  });

  return sendSuccess(res, "Expert weights fetched successfully", data);
};

/**
 * Reasigna el creador o responsable principal de un issue.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const reassignIssueAdminAdmin = async (req, res) => {
  const result = await reassignIssueAdminFlow({
    issueId: req.body?.issueId,
    newAdminId: req.body?.newAdminId,
  });

  return sendSuccess(
    res,
    result.message,
    {
      issue: result.issue,
      admin: result.admin,
    },
  );
};

/**
 * Permite al admin editar expertos de un issue reutilizando el flow de dominio.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const editIssueExpertsAdmin = async (req, res) => {
  const issueId = req.body?.issueId || req.body?.id;

  const { creatorUserId } = await getAdminIssueExecutionContextOrThrow({
    issueId,
  });

  const result = await editIssueExpertsFlow({
    issueId,
    userId: creatorUserId,
    expertsToAdd: Array.isArray(req.body?.expertsToAdd)
      ? req.body.expertsToAdd
      : [],
    expertsToRemove: Array.isArray(req.body?.expertsToRemove)
      ? req.body.expertsToRemove
      : [],
  });

  return sendSuccess(
    res,
    "Experts updated successfully",
    {
      issueName: result.issueName,
    },
  );
};

/**
 * Permite al admin computar pesos de un issue reutilizando flows de dominio.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const computeIssueWeightsAdmin = async (req, res) => {
  const issueId = req.body?.issueId || req.body?.id;

  const { issue, creatorUserId } = await getAdminIssueExecutionContextOrThrow({
    issueId,
  });

  const result =
    issue.weightingMode === "consensus"
      ? await computeManualCollectiveWeightsFlow({
          issueId,
          userId: creatorUserId,
        })
      : await computeBwmCollectiveWeightsFlow({
          issueId,
          userId: creatorUserId,
          apiModelsBaseUrl:
            process.env.ORIGIN_APIMODELS || "http://localhost:7000",
          httpClient: axios,
        });

  return sendSuccess(
    res,
    result.message,
    {
      finished: result.finished,
      weights: result.weights,
      criteriaOrder: result.criteriaOrder,
    },
  );
};

/**
 * Permite al admin resolver un issue reutilizando flows de dominio.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const resolveIssueAdmin = async (req, res) => {
  const issueId = req.body?.issueId || req.body?.id;
  const forceFinalize = Boolean(req.body?.forceFinalize);

  const { issue, creatorUserId } = await getAdminIssueExecutionContextOrThrow({
    issueId,
  });

  const evaluationStructure = resolveEvaluationStructure(issue);

  const result =
    evaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES
      ? await resolvePairwiseIssueFlow({
          issueId,
          userId: creatorUserId,
          forceFinalize,
          apiModelsBaseUrl:
            process.env.ORIGIN_APIMODELS || "http://localhost:7000",
          httpClient: axios,
        })
      : await resolveDirectIssueFlow({
          issueId,
          userId: creatorUserId,
          forceFinalize,
          apiModelsBaseUrl:
            process.env.ORIGIN_APIMODELS || "http://localhost:7000",
          httpClient: axios,
        });

  return sendSuccess(
    res,
    result.message,
    {
      finished: result.finished,
      rankedAlternatives: result.rankedAlternatives || null,
    },
  );
};

/**
 * Permite al admin eliminar un issue reutilizando el flow de lifecycle.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const removeIssueAdmin = async (req, res) => {
  const issueId = req.body?.issueId || req.body?.id;
  const session = await mongoose.startSession();

  try {
    let removedIssueName = "";

    await session.withTransaction(async () => {
      const { creatorUserId } = await getAdminIssueExecutionContextOrThrow({
        issueId,
        session,
      });

      const result = await deleteActiveIssueAsAdmin({
        issueId,
        userId: creatorUserId,
        session,
      });

      removedIssueName = result.issueName;
    });

    return sendSuccess(
      res,
      `Issue ${removedIssueName} removed`,
      {
        issueName: removedIssueName,
      },
    );
  } finally {
    await endSessionSafely(session);
  }
};