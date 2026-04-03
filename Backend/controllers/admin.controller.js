import axios from "axios";
import mongoose from "mongoose";

// Models
import { Issue } from "../models/Issues.js";

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
  createNotFoundError,
  getErrorResponsePayload,
  getErrorStatusCode,
} from "../utils/common/errors.js";
import { endSessionSafely } from "../utils/common/mongoose.js";

/**
 * Convierte un valor o documento en id string.
 *
 * @param {*} value Valor a convertir.
 * @returns {string}
 */
const asId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

/**
 * Comprueba si un valor es un ObjectId válido.
 *
 * @param {*} value Valor a validar.
 * @returns {boolean}
 */
const isValidObjectId = (value) => Boolean(value) && mongoose.Types.ObjectId.isValid(value);

/**
 * Obtiene el contexto necesario para ejecutar acciones de admin
 * sobre un issue reutilizando flows de dominio.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{ issue: Record<string, any>, creatorUserId: string }>}
 */
const getAdminIssueExecutionContextOrThrow = async ({
  issueId,
  session = null,
}) => {
  if (!issueId || !isValidObjectId(issueId)) {
    throw createBadRequestError("Valid issue id is required");
  }

  let query = Issue.findById(issueId).populate("model");

  if (session) {
    query = query.session(session);
  }

  const issue = await query;

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  return {
    issue,
    creatorUserId: asId(issue.admin),
  };
};

/**
 * Obtiene todos los usuarios visibles desde el panel de administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllUsersAdmin = async (req, res) => {
  try {
    const payload = await getAdminUsersListPayload({
      adminUserId: req.uid,
      search: String(req.query.q || "").trim(),
      includeAdmins: req.query.includeAdmins === "true",
    });

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error("getAllUsersAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(getErrorResponsePayload(err, "Error fetching users"));
  }
};

/**
 * Crea un nuevo usuario desde el panel de administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const createUserAdmin = async (req, res) => {
  try {
    const payload = await createUserAdminFlow({
      payload: req.body,
    });

    return res.status(201).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error("createUserAdmin error:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "Email already registered",
      });
    }

    return res
      .status(getErrorStatusCode(err))
      .json(getErrorResponsePayload(err, "Error creating user"));
  }
};

/**
 * Actualiza un usuario desde el panel de administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const updateUserAdmin = async (req, res) => {
  try {
    const payload = await updateUserAdminFlow({
      payload: req.body,
    });

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error("updateUserAdmin error:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "Email already registered",
      });
    }

    return res
      .status(getErrorStatusCode(err))
      .json(getErrorResponsePayload(err, "Error updating user"));
  }
};

/**
 * Elimina un usuario desde el panel de administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const deleteUserAdmin = async (req, res) => {
  const { id } = req.body || {};

  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      msg: "Valid user id is required",
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

    return res.status(200).json({
      success: true,
      msg: `User ${result.deletedUser.email} deleted successfully`,
      summary: result.summary,
    });
  } catch (err) {
    console.error("deleteUserAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(getErrorResponsePayload(err, "Error deleting user"));
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Obtiene el listado resumido de issues para el panel de administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllIssuesAdmin = async (req, res) => {
  try {
    const payload = await getAdminIssuesListPayload({
      search: String(req.query.q || "").trim(),
      active: String(req.query.active || "all").trim().toLowerCase(),
      currentStage: String(req.query.currentStage || "all").trim(),
      isConsensus: String(req.query.isConsensus || "all").trim().toLowerCase(),
      adminId: String(req.query.adminId || "").trim(),
      modelId: String(req.query.modelId || "").trim(),
    });

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error("getAllIssuesAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(getErrorResponsePayload(err, "Error fetching issues"));
  }
};

/**
 * Obtiene el detalle completo de un issue para administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueAdminById = async (req, res) => {
  try {
    const payload = await getIssueAdminDetailPayload({
      issueId: req.params?.id,
    });

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error("getIssueAdminById error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(
        getErrorResponsePayload(err, "Error fetching issue detail")
      );
  }
};

/**
 * Obtiene una vista resumida del progreso de expertos en un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueExpertsProgressAdmin = async (req, res) => {
  try {
    const payload = await getIssueExpertsProgressPayload({
      issueId: req.params?.id,
    });

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error("getIssueExpertsProgressAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(
        getErrorResponsePayload(
          err,
          "Error fetching issue experts progress"
        )
      );
  }
};

/**
 * Obtiene las evaluaciones de un experto en modo solo lectura.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueExpertEvaluationsAdmin = async (req, res) => {
  try {
    const payload = await getIssueExpertEvaluationsPayload({
      issueId: req.params?.issueId,
      expertId: req.params?.expertId,
    });

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error("getIssueExpertEvaluationsAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(
        getErrorResponsePayload(err, "Error fetching expert evaluations")
      );
  }
};

/**
 * Obtiene los pesos de un experto en modo solo lectura.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueExpertWeightsAdmin = async (req, res) => {
  try {
    const payload = await getIssueExpertWeightsPayload({
      issueId: req.params?.issueId,
      expertId: req.params?.expertId,
    });

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error("getIssueExpertWeightsAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(
        getErrorResponsePayload(err, "Error fetching expert weights")
      );
  }
};

/**
 * Reasigna el creador o responsable principal de un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const reassignIssueAdminAdmin = async (req, res) => {
  try {
    const payload = await reassignIssueAdminFlow({
      issueId: req.body?.issueId,
      newAdminId: req.body?.newAdminId,
    });

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error("reassignIssueAdminAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(
        getErrorResponsePayload(err, "Error reassigning issue admin")
      );
  }
};

/**
 * Permite al admin editar expertos de un issue reutilizando el flow de dominio.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const editIssueExpertsAdmin = async (req, res) => {
  try {
    const issueId = req.body?.issueId || req.body?.id;

    const { creatorUserId } = await getAdminIssueExecutionContextOrThrow({
      issueId,
    });

    await editIssueExpertsFlow({
      issueId,
      userId: creatorUserId,
      expertsToAdd: Array.isArray(req.body?.expertsToAdd)
        ? req.body.expertsToAdd
        : [],
      expertsToRemove: Array.isArray(req.body?.expertsToRemove)
        ? req.body.expertsToRemove
        : [],
    });

    return res.status(200).json({
      success: true,
      msg: "Experts updated successfully.",
    });
  } catch (err) {
    console.error("editIssueExpertsAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(
        getErrorResponsePayload(err, "Error editing issue experts")
      );
  }
};

/**
 * Permite al admin computar pesos de un issue reutilizando flows de dominio.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const computeIssueWeightsAdmin = async (req, res) => {
  try {
    const issueId = req.body?.issueId || req.body?.id;

    const { issue, creatorUserId } =
      await getAdminIssueExecutionContextOrThrow({
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

    return res.status(200).json(result);
  } catch (err) {
    console.error("computeIssueWeightsAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(
        getErrorResponsePayload(err, "Error computing issue weights")
      );
  }
};

/**
 * Permite al admin resolver un issue reutilizando flows de dominio.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const resolveIssueAdmin = async (req, res) => {
  try {
    const issueId = req.body?.issueId || req.body?.id;
    const forceFinalize = Boolean(req.body?.forceFinalize);

    const { issue, creatorUserId } =
      await getAdminIssueExecutionContextOrThrow({
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

    return res.status(200).json(result);
  } catch (err) {
    console.error("resolveIssueAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(
        getErrorResponsePayload(err, "Error resolving issue")
      );
  }
};

/**
 * Permite al admin eliminar un issue reutilizando el flow de lifecycle.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
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

    return res.status(200).json({
      success: true,
      msg: `Issue ${removedIssueName} removed`,
    });
  } catch (err) {
    console.error("removeIssueAdmin error:", err);

    return res
      .status(getErrorStatusCode(err))
      .json(
        getErrorResponsePayload(err, "Error removing issue")
      );
  } finally {
    await endSessionSafely(session);
  }
};