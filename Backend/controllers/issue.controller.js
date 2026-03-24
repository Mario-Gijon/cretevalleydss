// Models
import { Alternative } from "../models/Alternatives.js";
import { Consensus } from "../models/Consensus.js";
import { CriteriaWeightEvaluation } from "../models/CriteriaWeightEvaluation.js";
import { Criterion } from "../models/Criteria.js";
import { Issue } from "../models/Issues.js";
import { IssueModel } from "../models/IssueModels.js";
import { Notification } from "../models/Notificacions.js";
import { Participation } from "../models/Participations.js";
import { User } from "../models/Users.js";

// Utils
import { getUserFinishedIssueIds } from "../modules/issues/issue.queries.js";
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "../modules/issues/issue.ordering.js";
import { sendExpertInvitationEmail } from "../services/email.service.js";
import {
  validateFinalEvaluations,
  validateFinalPairwiseEvaluations,
  validateFinalWeights
} from "../modules/issues/issue.validation.js"


import {
  createNotFoundError,
  getErrorResponsePayload,
  getErrorStatusCode,
} from "../utils/common/errors.js";
import {
  abortTransactionSafely,
  endSessionSafely,
} from "../utils/common/mongoose.js";
import { sameId, toIdString } from "../utils/common/ids.js";
import { resolveIssueHandlerOrThrow } from "../modules/issues/issue.dispatch.js";

// Modules
import {
  buildActiveIssueCollections,
  buildActiveIssueView,
  buildActiveIssuesResponseMeta,
  buildEmptyActiveIssuesPayload,
  getEmptyTasksByType,
  sortActiveIssues,
  sortActiveTasksByType,
} from "../modules/issues/issue.active.js";
import {
  getAcceptedParticipation,
  getOrderedLeafCriteriaForIssue,
  getVisibleActiveIssueIdsForUser,
} from "../modules/issues/issue.queries.js";
import {
  createIssueScenarioFlow,
  getIssueScenariosPayload,
  getScenarioByIdPayload,
  removeIssueScenarioFlow,
} from "../modules/issues/issue.scenarios.js";
import {
  buildBwmEvaluationPayload,
  buildOrderedManualWeights,
  computeNormalizedCollectiveManualWeights,
  getRawManualWeightsPayload,
  markParticipationWeightsCompleted,
  syncIssueStageAfterWeightsCompletion,
} from "../modules/issues/issue.weights.js";
import {
  getDirectEvaluationPayload,
  getPairwiseEvaluationPayload,
  saveDirectEvaluationDrafts,
  savePairwiseEvaluationDrafts,
} from "../modules/issues/issue.evaluations.js";
import {
  resolveDirectIssueFlow,
  resolvePairwiseIssueFlow,
} from "../modules/issues/issue.resolution.js";
import {
  deleteActiveIssueAsAdmin,
  hideFinishedIssueForUserFlow,
  leaveActiveIssueFlow,
} from "../modules/issues/issue.lifecycle.js";
import {
  createUserExpressionDomain,
  getExpressionDomainsPayload,
  removeUserExpressionDomain,
  updateUserExpressionDomain,
} from "../modules/issues/issue.expressionDomains.js";
import { getFinishedIssueInfoPayload } from "../modules/issues/issue.finished.js";
import { editIssueExpertsFlow } from "../modules/issues/issue.experts.js";
import { createIssueFlow } from "../modules/issues/issue.creation.js";

// External libraries
import axios from "axios";
import dayjs from "dayjs";
import mongoose from "mongoose";

/**
 * Obtiene la información de modelos disponibles.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const modelsInfo = async (req, res) => {
  try {
    const models = await IssueModel.find().select("-__v").lean();

    return res.status(200).json({
      success: true,
      data: models,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Server error",
    });
  }
};

/**
 * Obtiene todos los usuarios visibles para la creación de issues.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ accountConfirm: true })
      .select("name university email")
      .lean();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Server error",
    });
  }
};

/**
 * Obtiene los dominios de expresión globales y del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getExpressionsDomain = async (req, res) => {
  try {
    const data = await getExpressionDomainsPayload({
      userId: req.uid,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      msg: "Error fetching domains",
    });
  }
};

/**
 * Crea un nuevo dominio de expresión de usuario.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const createExpressionDomain = async (req, res) => {
  try {
    const newDomain = await createUserExpressionDomain({
      userId: req.uid,
      payload: req.body,
    });

    return res.status(201).json({
      success: true,
      msg: `Domain ${newDomain.name} created successfully`,
      data: newDomain,
    });
  } catch (error) {
    console.error(error);

    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        msg: error.message,
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "A domain with the same name already exists (for this user).",
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Error creating domain",
    });
  }
};

/**
 * Crea un nuevo issue con alternativas, criterios, participaciones,
 * snapshots de dominios y evaluaciones iniciales.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const createIssue = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const issueInfo = req.body?.issueInfo || {};

    let result = null;

    await session.withTransaction(async () => {
      result = await createIssueFlow({
        issueInfo,
        adminUserId: req.uid,
        session,
      });
    });

    for (const emailPayload of result?.emailsToSend || []) {
      try {
        await sendExpertInvitationEmail(emailPayload);
      } catch (error) {
        console.error(
          "Failed sending invitation email:",
          emailPayload.expertEmail,
          error
        );
      }
    }

    return res.status(201).json({
      success: true,
      msg: `Issue ${result?.issueName || ""} created successfully`,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(getErrorResponsePayload(error, "Server error creating issue"));
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Obtiene todos los issues activos visibles para el usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllActiveIssues = async (req, res) => {
  const userId = toIdString(req.uid);

  try {
    const { issueIds, adminIssueIds } = await getVisibleActiveIssueIdsForUser(
      userId
    );

    if (issueIds.length === 0) {
      return res.json(buildEmptyActiveIssuesPayload());
    }

    const adminIssueIdSet = new Set(adminIssueIds);

    const [issues, allParticipations, alternatives, criteria, consensusPhases] =
      await Promise.all([
        Issue.find({ _id: { $in: issueIds } })
          .populate("model")
          .populate("admin", "email name")
          .lean(),
        Participation.find({ issue: { $in: issueIds } })
          .populate("expert", "email")
          .lean(),
        Alternative.find({ issue: { $in: issueIds } }).lean(),
        Criterion.find({ issue: { $in: issueIds } }).lean(),
        Consensus.find({ issue: { $in: issueIds } }, "issue phase").lean(),
      ]);

    const {
      participationMap,
      alternativesMap,
      criteriaMap,
      consensusPhaseCountMap,
    } = buildActiveIssueCollections({
      participations: allParticipations,
      alternatives,
      criteria,
      consensusPhases,
    });

    const tasksByType = getEmptyTasksByType();

    const formattedIssues = issues.map((issue) => {
      const issueId = toIdString(issue._id);

      const { issueView, taskItems } = buildActiveIssueView({
        issue,
        userId,
        adminIssueIdSet,
        issueParticipations: participationMap[issueId] || [],
        issueAlternativeDocs: alternativesMap[issueId] || [],
        issueCriteriaDocs: criteriaMap[issueId] || [],
        savedPhasesCount: consensusPhaseCountMap[issueId] || 0,
        dayjsLib: dayjs,
      });

      for (const taskItem of taskItems) {
        if (!tasksByType[taskItem.actionKey]) {
          tasksByType[taskItem.actionKey] = [];
        }

        tasksByType[taskItem.actionKey].push(taskItem);
      }

      return issueView;
    });

    sortActiveIssues(formattedIssues);
    sortActiveTasksByType(tasksByType);

    const { tasks, taskCenter, filtersMeta } = buildActiveIssuesResponseMeta({
      formattedIssues,
      tasksByType,
    });

    return res.json({
      success: true,
      issues: formattedIssues,
      tasks,
      taskCenter,
      filtersMeta,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Error fetching active issues",
    });
  }
};

/**
 * Elimina un issue activo y todos sus datos relacionados.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeIssue = async (req, res) => {
  const { id } = req.body;
  const userId = req.uid;

  const session = await mongoose.startSession();

  try {
    let removedIssueName = "";

    await session.withTransaction(async () => {
      const result = await deleteActiveIssueAsAdmin({
        issueId: id,
        userId,
        session,
      });

      removedIssueName = result.issueName;
    });

    return res.status(200).json({
      success: true,
      msg: `Issue ${removedIssueName} removed`,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while deleting the issue"
        )
      );
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Elimina un dominio de expresión del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeExpressionDomain = async (req, res) => {
  const { id } = req.body;

  try {
    await removeUserExpressionDomain({
      domainId: id,
      userId: req.uid,
    });

    return res.status(200).json({
      success: true,
      msg: "Domain deleted",
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(getErrorResponsePayload(error, "Error deleting domain"));
  }
};

/**
 * Actualiza un dominio de expresión del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const updateExpressionDomain = async (req, res) => {
  const { id, updatedDomain } = req.body;
  const userId = toIdString(req.uid);

  const session = await mongoose.startSession();

  try {
    let updated = null;

    await session.withTransaction(async () => {
      updated = await updateUserExpressionDomain({
        domainId: id,
        userId,
        updatedDomain,
        session,
      });
    });

    return res.status(200).json({
      success: true,
      msg: "Domain updated successfully",
      data: updated,
    });
  } catch (error) {
    await abortTransactionSafely(session);
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while updating the domain"
        )
      );
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Obtiene todos los issues finalizados visibles para el usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllFinishedIssues = async (req, res) => {
  try {
    const userId = toIdString(req.uid);
    const issueIds = await getUserFinishedIssueIds(userId);

    if (issueIds.length === 0) {
      return res.json({
        success: true,
        issues: [],
      });
    }

    const issues = await Issue.find({ _id: { $in: issueIds } })
      .populate("model", "name")
      .populate("admin", "email")
      .lean();

    const formattedIssues = issues.map((issue) => ({
      id: toIdString(issue._id),
      name: issue.name,
      description: issue.description,
      creationDate: issue.creationDate,
      createdAt: issue.createdAt ?? null,
      closureDate: issue.closureDate ?? null,
      isAdmin: sameId(issue.admin?._id, userId),
    }));

    return res.json({
      success: true,
      issues: formattedIssues,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Error fetching finished issues",
    });
  }
};

/**
 * Obtiene las notificaciones del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getNotifications = async (req, res) => {
  const userId = req.uid;

  try {
    const [notifications, participations] = await Promise.all([
      Notification.find({ expert: userId })
        .sort({ createdAt: -1 })
        .populate("expert", "email")
        .populate("issue", "name"),
      Participation.find({ expert: userId }),
    ]);

    const formattedNotifications = notifications.map((notification) => {
      const participation = participations.find((item) =>
        sameId(item.issue, notification.issue?._id)
      );

      let responseStatus = false;

      if (participation) {
        if (participation.invitationStatus === "accepted") {
          responseStatus = "Invitation accepted";
        } else if (participation.invitationStatus === "declined") {
          responseStatus = "Invitation declined";
        }
      }

      return {
        _id: notification._id,
        header:
          notification.type === "invitation"
            ? "Invitation"
            : notification.issue?.name,
        message: notification.message,
        userEmail: notification.expert
          ? notification.expert.email
          : "Usuario eliminado",
        issueName: notification.issue
          ? notification.issue.name
          : "Problema eliminado",
        issueId: notification.issue ? toIdString(notification.issue._id) : null,
        requiresAction: notification.requiresAction,
        read: notification.read ?? false,
        createdAt: notification.createdAt,
        responseStatus,
      };
    });

    return res.status(200).json({
      success: true,
      notifications: formattedNotifications,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while getting notifications",
    });
  }
};

/**
 * Marca como leídas todas las notificaciones no leídas del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const markAllNotificationsAsRead = async (req, res) => {
  const userId = req.uid;

  try {
    await Notification.updateMany(
      { expert: userId, read: false },
      { read: true }
    );

    return res.status(200).json({
      success: true,
      msg: "Notifications marked as read",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while updating notifications",
    });
  }
};

/**
 * Cambia el estado de invitación del usuario actual para un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const changeInvitationStatus = async (req, res) => {
  const userId = req.uid;
  const { id, action } = req.body;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const issue = await Issue.findById(id).session(session);
      if (!issue) {
        throw createNotFoundError("Issue not found");
      }

      const participation = await Participation.findOne({
        issue: issue._id,
        expert: userId,
      }).session(session);

      if (!participation) {
        throw createNotFoundError(
          "No participation found for the user in this issue"
        );
      }

      participation.invitationStatus = action;

      if (action === "accepted") {
        participation.evaluationCompleted = false;
      }

      await participation.save({ session });
    });

    const issue = await Issue.findById(id).select("name").lean();

    const message =
      action === "accepted"
        ? `Invitation to issue ${issue?.name} accepted`
        : `Invitation to issue ${issue?.name} declined`;

    return res.status(200).json({
      success: true,
      msg: message,
    });
  } catch (error) {
    await abortTransactionSafely(session);
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while updating invitation status"
        )
      );
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Elimina una notificación concreta del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeNotificationById = async (req, res) => {
  const userId = req.uid;
  const { notificationId } = req.body;

  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      expert: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        msg: "Notification not found",
      });
    }

    await Notification.deleteOne({ _id: notificationId });

    return res.status(200).json({
      success: true,
      msg: "Message removed",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while removing notification",
    });
  }
};

/**
 * Guarda borradores de evaluaciones pairwise del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const savePairwiseEvaluations = async (req, res) => {
  try {
    const { id, evaluations } = req.body;

    await savePairwiseEvaluationDrafts({
      issueId: id,
      userId: req.uid,
      evaluations,
    });

    return res.status(200).json({
      success: true,
      msg: "Evaluations saved successfully",
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while saving evaluations"
        )
      );
  }
};

/**
 * Obtiene las evaluaciones pairwise del experto actual para un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getPairwiseEvaluations = async (req, res) => {
  try {
    const { id } = req.body;

    const { evaluations, collectiveEvaluations } =
      await getPairwiseEvaluationPayload({
        issueId: id,
        userId: req.uid,
      });

    return res.status(200).json({
      success: true,
      evaluations,
      collectiveEvaluations,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while fetching evaluations"
        )
      );
  }
};

/**
 * Valida y envía las evaluaciones pairwise del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const submitPairwiseEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, evaluations } = req.body;

    const validation = validateFinalPairwiseEvaluations(evaluations);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        criterion: validation.error.criterion,
        msg: validation.error.message,
      });
    }

    await savePairwiseEvaluationDrafts({
      issueId: id,
      userId,
      evaluations,
    });

    const participation = await Participation.findOneAndUpdate(
      {
        issue: id,
        expert: userId,
        invitationStatus: "accepted",
      },
      { $set: { evaluationCompleted: true } },
      { new: true }
    );

    if (!participation) {
      return res.status(404).json({
        success: false,
        msg: "Participation not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "Evaluations submitted successfully",
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while sending evaluations"
        )
      );
  }
};

/**
 * Resuelve un issue con evaluación pairwise y gestiona el flujo de consenso si aplica.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const resolvePairwiseIssue = async (req, res) => {
  try {
    const { id, forceFinalize = false } = req.body;

    const result = await resolvePairwiseIssueFlow({
      issueId: id,
      userId: req.uid,
      forceFinalize: Boolean(forceFinalize),
      apiModelsBaseUrl: process.env.ORIGIN_APIMODELS || "http://localhost:7000",
      httpClient: axios,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while resolving the issue"
        )
      );
  }
};

/**
 * Oculta un issue finalizado para el usuario actual y elimina sus datos
 * si todos los usuarios con visibilidad ya lo han ocultado.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeFinishedIssue = async (req, res) => {
  const { id } = req.body;
  const userId = req.uid;

  const session = await mongoose.startSession();

  try {
    let removedIssueName = "";

    await session.withTransaction(async () => {
      const result = await hideFinishedIssueForUserFlow({
        issueId: id,
        userId,
        session,
      });

      removedIssueName = result.issueName;
    });

    return res.status(200).json({
      success: true,
      msg: `Issue ${removedIssueName} removed`,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while removing the issue"
        )
      );
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Añade o expulsa expertos de un issue activo.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const editExperts = async (req, res) => {
  const { id, expertsToAdd = [], expertsToRemove = [] } = req.body;

  try {
    await editIssueExpertsFlow({
      issueId: id,
      userId: req.uid,
      expertsToAdd,
      expertsToRemove,
    });

    return res.status(200).json({
      success: true,
      msg: "Experts updated successfully.",
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while editing experts."
        )
      );
  }
};

/**
 * Permite a un experto abandonar un issue activo.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const leaveIssue = async (req, res) => {
  const { id } = req.body;
  const userId = req.uid;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await leaveActiveIssueFlow({
        issueId: id,
        userId,
        session,
      });
    });

    return res.status(200).json({
      success: true,
      msg: "You have left the issue successfully",
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while leaving issue"
        )
      );
  } finally {
    await endSessionSafely(session);
  }
};
/**
 * Guarda borradores de evaluaciones directas del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const saveDirectEvaluations = async (req, res) => {
  try {
    const { id, evaluations } = req.body;

    await saveDirectEvaluationDrafts({
      issueId: id,
      userId: req.uid,
      evaluations,
    });

    return res.status(200).json({
      success: true,
      msg: "Evaluations saved successfully",
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while saving evaluations"
        )
      );
  }
};

/**
 * Obtiene las evaluaciones directas del experto actual para un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getDirectEvaluations = async (req, res) => {
  try {
    const { id } = req.body;

    const { evaluations, collectiveEvaluations } =
      await getDirectEvaluationPayload({
        issueId: id,
        userId: req.uid,
      });

    return res.status(200).json({
      success: true,
      evaluations,
      collectiveEvaluations,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while fetching evaluations"
        )
      );
  }
};

/**
 * Valida y envía las evaluaciones directas del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const submitDirectEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, evaluations } = req.body;

    const validation = validateFinalEvaluations(evaluations);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        alternative: validation.error.alternative,
        criterion: validation.error.criterion,
        msg: validation.error.message,
      });
    }

    await saveDirectEvaluationDrafts({
      issueId: id,
      userId,
      evaluations,
    });

    const participation = await Participation.findOneAndUpdate(
      {
        issue: id,
        expert: userId,
        invitationStatus: "accepted",
      },
      { $set: { evaluationCompleted: true } },
      { new: true }
    );

    if (!participation) {
      return res.status(404).json({
        success: false,
        msg: "Participation not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "Evaluations submitted successfully",
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while sending evaluations"
        )
      );
  }
};

/**
 * Resuelve un issue con evaluación directa y gestiona el flujo de consenso si aplica.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const resolveDirectIssue = async (req, res) => {
  try {
    const { id, forceFinalize = false } = req.body;

    const result = await resolveDirectIssueFlow({
      issueId: id,
      userId: req.uid,
      forceFinalize: Boolean(forceFinalize),
      apiModelsBaseUrl: process.env.ORIGIN_APIMODELS || "http://localhost:7000",
      httpClient: axios,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while resolving the issue"
        )
      );
  }
};

/**
 * Obtiene toda la información de un issue finalizado para la pantalla de detalle.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getFinishedIssueInfo = async (req, res) => {
  try {
    const { id } = req.body;

    const issueInfo = await getFinishedIssueInfoPayload({
      issueId: id,
    });

    return res.json({
      success: true,
      msg: "Issue info sent",
      issueInfo,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(error, "Error fetching full issue info")
      );
  }
};

/**
 * Guarda pesos BWM del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} [res] Response de Express.
 * @returns {Promise<object | void>}
 */
export const saveBwmWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, bwmData, send = false } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      const response = { success: false, msg: "Issue not found" };
      return res ? res.status(404).json(response) : response;
    }

    const participation = await getAcceptedParticipation(issue._id, userId);
    if (!participation) {
      const response = {
        success: false,
        msg: "You are no longer a participant in this issue",
      };
      return res ? res.status(403).json(response) : response;
    }

    if (!bwmData.bestCriterion || !bwmData.worstCriterion) {
      const response = {
        success: false,
        msg: "Missing best or worst criterion",
      };
      return res ? res.status(400).json(response) : response;
    }

    const payload = buildBwmEvaluationPayload({
      issueId: issue._id,
      userId,
      bwmData,
      send,
    });

    const existingEvaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    });

    if (existingEvaluation) {
      await CriteriaWeightEvaluation.updateOne(
        { _id: existingEvaluation._id },
        { $set: payload }
      );
    } else {
      await CriteriaWeightEvaluation.create(payload);
    }

    const successResponse = {
      success: true,
      msg: send ? "Weights submitted successfully" : "Weights saved successfully",
    };

    return res ? res.status(200).json(successResponse) : successResponse;
  } catch (error) {
    console.error(error);

    const errorResponse = {
      success: false,
      msg: "An error occurred while saving weights",
    };

    return res ? res.status(500).json(errorResponse) : errorResponse;
  }
};

/**
 * Obtiene los pesos BWM guardados del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getBwmWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const participation = await getAcceptedParticipation(issue._id, userId);
    if (!participation) {
      return res.status(403).json({
        success: false,
        msg: "You are no longer a participant in this issue",
      });
    }

    const leafDocs = await getOrderedLeafCriteriaForIssue(issue);
    const leafNames = leafDocs.map((criterion) => criterion.name);

    const existingEvaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    }).lean();

    const bestToOthers = {};
    const othersToWorst = {};

    for (const name of leafNames) {
      const value1 = existingEvaluation?.bestToOthers?.[name];
      const value2 = existingEvaluation?.othersToWorst?.[name];

      bestToOthers[name] = value1 === null || value1 === undefined ? "" : value1;
      othersToWorst[name] = value2 === null || value2 === undefined ? "" : value2;
    }

    const bwmData = {
      bestCriterion: existingEvaluation?.bestCriterion || "",
      worstCriterion: existingEvaluation?.worstCriterion || "",
      bestToOthers,
      othersToWorst,
      completed: existingEvaluation?.completed || false,
    };

    return res.status(200).json({
      success: true,
      bwmData,
    });
  } catch (error) {
    console.error("getBwmWeights error:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while fetching weights",
    });
  }
};

/**
 * Valida y envía los pesos BWM del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const sendBwmWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, bwmData } = req.body;

    const validation = validateFinalWeights(bwmData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        msg: validation.msg,
        field: validation.field,
      });
    }

    if (bwmData.bestCriterion) {
      bwmData.bestToOthers = {
        ...bwmData.bestToOthers,
        [bwmData.bestCriterion]: 1,
      };
    }

    if (bwmData.worstCriterion) {
      bwmData.othersToWorst = {
        ...bwmData.othersToWorst,
        [bwmData.worstCriterion]: 1,
      };
    }

    const saveResult = await saveBwmWeights(req);
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        msg: saveResult.msg || "Error saving weights",
      });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    await CriteriaWeightEvaluation.updateOne(
      { issue: issue._id, expert: userId },
      { $set: { completed: true } }
    );

    await markParticipationWeightsCompleted({
      ParticipationModel: Participation,
      issueId: issue._id,
      userId,
    });

    await syncIssueStageAfterWeightsCompletion(issue);

    return res.status(200).json({
      success: true,
      msg: "Weights submitted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while sending weights",
    });
  }
};

/**
 * Calcula pesos BWM colectivos y actualiza el issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const computeWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    if (issue.admin.toString() !== userId) {
      return res.status(403).json({
        success: false,
        msg: "Unauthorized: only admin can compute weights",
      });
    }

    await ensureIssueOrdersDb({ issueId: issue._id });

    const pendingWeights = await Participation.find({
      issue: issue._id,
      invitationStatus: { $in: ["accepted", "pending"] },
      weightsCompleted: false,
    });

    if (pendingWeights.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "Not all experts have completed their criteria weight evaluations",
      });
    }

    const criteria = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    });

    const criterionNames = criteria.map((criterion) => criterion.name);

    const weightEvaluations = await CriteriaWeightEvaluation.find({
      issue: issue._id,
    }).populate("expert", "email");

    if (weightEvaluations.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No BWM evaluations found for this issue",
      });
    }

    const expertsData = {};

    for (const evaluation of weightEvaluations) {
      const {
        bestCriterion,
        worstCriterion,
        bestToOthers,
        othersToWorst,
      } = evaluation;

      if (!bestCriterion || !worstCriterion) continue;

      const mic = criterionNames.map(
        (criterionName) => Number(bestToOthers?.[criterionName]) || 1
      );
      const lic = criterionNames.map(
        (criterionName) => Number(othersToWorst?.[criterionName]) || 1
      );

      const expertEmail =
        evaluation.expert?.email || `expert_${evaluation.expert?._id}`;

      expertsData[expertEmail] = { mic, lic };
    }

    if (Object.keys(expertsData).length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Incomplete BWM data from experts",
      });
    }

    const apimodelsUrl =
      process.env.ORIGIN_APIMODELS || "http://localhost:7000";

    const response = await axios.post(`${apimodelsUrl}/bwm`, {
      experts_data: expertsData,
      eps_penalty: 1,
    });

    const { success, msg, results } = response.data;
    if (!success) {
      return res.status(400).json({
        success: false,
        msg,
      });
    }

    const weights = results?.weights || [];

    issue.modelParameters = {
      ...(issue.modelParameters || {}),
      weights: weights.slice(0, criterionNames.length),
    };
    issue.currentStage = "alternativeEvaluation";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: `Criteria weights for '${issue.name}' successfully computed.`,
      weights: issue.modelParameters.weights,
      criteriaOrder: criterionNames,
    });
  } catch (error) {
    console.error("Error in computeWeights:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while computing weights",
    });
  }
};

/**
 * Guarda borradores de pesos manuales del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const saveManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;
    const raw = getRawManualWeightsPayload(req.body);

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const participation = await getAcceptedParticipation(issue._id, userId);
    if (!participation) {
      return res.status(403).json({
        success: false,
        msg: "You are no longer a participant",
      });
    }

    const leafDocs = await getOrderedLeafCriteriaForIssue(issue);
    const manualWeights = buildOrderedManualWeights(raw, leafDocs);

    await CriteriaWeightEvaluation.updateOne(
      { issue: issue._id, expert: userId },
      {
        $set: {
          issue: issue._id,
          expert: userId,
          manualWeights,
          completed: false,
          consensusPhase: 1,
        },
      },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      msg: "Manual weights saved successfully",
    });
  } catch (error) {
    console.error("saveManualWeights error:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while saving",
    });
  }
};

/**
 * Obtiene los pesos manuales guardados del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const participation = await getAcceptedParticipation(issue._id, userId);
    if (!participation) {
      return res.status(403).json({
        success: false,
        msg: "You are no longer a participant",
      });
    }

    const leafDocs = await getOrderedLeafCriteriaForIssue(issue);
    const leafNames = leafDocs.map((criterion) => criterion.name);

    const evaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    }).lean();

    const manualWeights = {};
    for (const name of leafNames) {
      const value = evaluation?.manualWeights?.[name];
      manualWeights[name] = value === null || value === undefined ? "" : value;
    }

    return res.status(200).json({
      success: true,
      manualWeights,
    });
  } catch (error) {
    console.error("getManualWeights error:", error);
    return res.status(500).json({
      success: false,
      msg: "Error fetching manual weights",
    });
  }
};

/**
 * Valida y envía los pesos manuales del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const sendManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;
    const raw = getRawManualWeightsPayload(req.body);

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const criteria = await getOrderedLeafCriteriaForIssue(issue);
    const criterionNames = criteria.map((criterion) => criterion.name);
    const manualWeights = buildOrderedManualWeights(raw, criteria);

    const missing = criterionNames.filter(
      (criterionName) => manualWeights[criterionName] == null
    );
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "All criteria must have a weight",
      });
    }

    const invalid = criterionNames.find((criterionName) => {
      const value = manualWeights[criterionName];
      return value < 0 || value > 1;
    });

    if (invalid) {
      return res.status(400).json({
        success: false,
        msg: `Weight for '${invalid}' must be between 0 and 1`,
      });
    }

    const sum = criterionNames.reduce(
      (acc, criterionName) => acc + Number(manualWeights[criterionName]),
      0
    );

    if (Math.abs(sum - 1) > 0.001) {
      return res.status(400).json({
        success: false,
        msg: `Manual weights must sum to 1. Current sum: ${sum}`,
      });
    }

    await CriteriaWeightEvaluation.updateOne(
      { issue: issue._id, expert: userId },
      {
        $set: {
          issue: issue._id,
          expert: userId,
          manualWeights,
          completed: true,
          consensusPhase: 1,
        },
      },
      { upsert: true }
    );

    await markParticipationWeightsCompleted({
      ParticipationModel: Participation,
      issueId: issue._id,
      userId,
    });

    await syncIssueStageAfterWeightsCompletion(issue);

    return res.status(200).json({
      success: true,
      msg: "Manual weights submitted successfully",
    });
  } catch (error) {
    console.error("sendManualWeights error:", error);
    return res.status(500).json({
      success: false,
      msg: "Error submitting manual weights",
    });
  }
};

/**
 * Calcula pesos manuales colectivos y actualiza el issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const computeManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    if (issue.admin.toString() !== userId) {
      return res.status(403).json({
        success: false,
        msg: "Unauthorized: only admin can compute weights",
      });
    }

    if (issue.weightingMode !== "consensus") {
      return res.status(400).json({
        success: false,
        msg: "This issue is not using manual consensus weighting mode",
      });
    }

    await ensureIssueOrdersDb({ issueId: issue._id });

    const participations = await Participation.find({
      issue: issue._id,
      invitationStatus: "accepted",
    });

    const weightsPending = participations.filter(
      (participation) => !participation.weightsCompleted
    );

    if (weightsPending.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "Not all experts have completed their criteria weight evaluations",
      });
    }

    const criteria = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    });

    const criterionNames = criteria.map((criterion) => criterion.name);

    const evaluations = await CriteriaWeightEvaluation.find({
      issue: issue._id,
      completed: true,
    });

    if (evaluations.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No manual weight evaluations found for this issue",
      });
    }

    const normalizedWeights = computeNormalizedCollectiveManualWeights({
      evaluations,
      criterionNames,
    });

    issue.modelParameters = { ...(issue.modelParameters || {}) };
    issue.modelParameters.weights = normalizedWeights;

    issue.currentStage = "alternativeEvaluation";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: "Criteria weights computed",
      weights: issue.modelParameters.weights,
      criteriaOrder: criterionNames,
    });
  } catch (error) {
    console.error("Error computing manual weights:", error);
    return res.status(500).json({
      success: false,
      msg: "Error computing manual weights",
    });
  }
};

/**
 * Crea un escenario de simulación para un issue resuelto.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const createIssueScenario = async (req, res) => {
  try {
    const {
      issueId,
      targetModelName,
      targetModelId,
      scenarioName = "",
      paramOverrides = {},
    } = req.body || {};

    const { scenarioId } = await createIssueScenarioFlow({
      userId: req.uid,
      issueId,
      targetModelName,
      targetModelId,
      scenarioName,
      paramOverrides,
    });

    return res.status(201).json({
      success: true,
      msg: "Scenario created successfully",
      scenarioId,
    });
  } catch (error) {
    console.error("createIssueScenario error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(getErrorResponsePayload(error, "Error creating scenario"));
  }
};

/**
 * Lista los escenarios creados para un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueScenarios = async (req, res) => {
  try {
    const { issueId } = req.body;

    const { scenarios } = await getIssueScenariosPayload({ issueId });

    return res.json({
      success: true,
      scenarios,
    });
  } catch (error) {
    console.error("getIssueScenarios error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(getErrorResponsePayload(error, "Error listing scenarios"));
  }
};

/**
 * Obtiene un escenario por su id.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getScenarioById = async (req, res) => {
  try {
    const { scenarioId } = req.body;

    const { scenario } = await getScenarioByIdPayload({ scenarioId });

    return res.json({
      success: true,
      scenario,
    });
  } catch (error) {
    console.error("getScenarioById error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(getErrorResponsePayload(error, "Error fetching scenario"));
  }
};

/**
 * Elimina un escenario si el usuario actual es su creador o admin del issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeScenario = async (req, res) => {
  try {
    const { scenarioId } = req.body;

    await removeIssueScenarioFlow({
      scenarioId,
      userId: req.uid,
    });

    return res.json({
      success: true,
      msg: "Scenario deleted",
    });
  } catch (error) {
    console.error("removeScenario error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(getErrorResponsePayload(error, "Error deleting scenario"));
  }
};

/**
 * Guarda evaluaciones del experto actual según la estructura del issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const saveEvaluations = async (req, res) => {
  try {
    const { id } = req.body;

    const { handler } = await resolveIssueHandlerOrThrow({
      issueId: id,
      handlers: {
        direct: saveDirectEvaluations,
        pairwise: savePairwiseEvaluations,
      },
    });

    return handler(req, res);
  } catch (error) {
    console.error("saveEvaluations dispatcher error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while saving evaluations"
        )
      );
  }
};

/**
 * Obtiene evaluaciones del experto actual según la estructura del issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getEvaluations = async (req, res) => {
  try {
    const { id } = req.body;

    const { handler } = await resolveIssueHandlerOrThrow({
      issueId: id,
      handlers: {
        direct: getDirectEvaluations,
        pairwise: getPairwiseEvaluations,
      },
    });

    return handler(req, res);
  } catch (error) {
    console.error("getEvaluations dispatcher error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while fetching evaluations"
        )
      );
  }
};

/**
 * Envía evaluaciones del experto actual según la estructura del issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const submitEvaluations = async (req, res) => {
  try {
    const { id } = req.body;

    const { handler } = await resolveIssueHandlerOrThrow({
      issueId: id,
      handlers: {
        direct: submitDirectEvaluations,
        pairwise: submitPairwiseEvaluations,
      },
    });

    return handler(req, res);
  } catch (error) {
    console.error("submitEvaluations dispatcher error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while submitting evaluations"
        )
      );
  }
};

/**
 * Resuelve un issue según la estructura de evaluación configurada.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const resolveIssue = async (req, res) => {
  try {
    const { id } = req.body;

    const { handler } = await resolveIssueHandlerOrThrow({
      issueId: id,
      handlers: {
        direct: resolveDirectIssue,
        pairwise: resolvePairwiseIssue,
      },
    });

    return handler(req, res);
  } catch (error) {
    console.error("resolveIssue dispatcher error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while resolving the issue"
        )
      );
  }
};