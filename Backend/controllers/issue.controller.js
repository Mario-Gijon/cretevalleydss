// Models
import { Alternative } from "../models/Alternatives.js";
import { Consensus } from "../models/Consensus.js";
import { Issue } from "../models/Issues.js";
import { IssueModel } from "../models/IssueModels.js";
import { Participation } from "../models/Participations.js";
import { User } from "../models/Users.js";

// Utils
import { getUserFinishedIssueIds } from "../modules/issues/issue.queries.js";
import { sendExpertInvitationEmail } from "../services/email.service.js";

import {
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
  getVisibleActiveIssueIdsForUser,
} from "../modules/issues/issue.queries.js";
import {
  createIssueScenarioFlow,
  getIssueScenariosPayload,
  getScenarioByIdPayload,
  removeIssueScenarioFlow,
} from "../modules/issues/issue.scenarios.js";
import {
  computeBwmCollectiveWeightsFlow,
  computeManualCollectiveWeightsFlow,
  getBwmWeightsPayload,
  getManualWeightsPayload,
  saveBwmWeightsDraftFlow,
  saveManualWeightsDraftFlow,
  submitBwmWeightsFlow,
  submitManualWeightsFlow,
} from "../modules/issues/issue.weights.js";
import {
  getDirectEvaluationPayload,
  getPairwiseEvaluationPayload,
  saveDirectEvaluationDrafts,
  savePairwiseEvaluationDrafts,
  submitDirectEvaluationFlow,
  submitPairwiseEvaluationFlow,
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
import {
  changeInvitationStatusFlow,
  getNotificationsPayload,
  markAllNotificationsAsReadFlow,
  removeNotificationForUserFlow,
} from "../modules/issues/issue.notifications.js";
import { getFinishedIssueInfoPayload } from "../modules/issues/issue.finished.js";
import { editIssueExpertsFlow } from "../modules/issues/issue.experts.js";
import { createIssueFlow } from "../modules/issues/issue.creation.js";

// External libraries
import axios from "axios";
import dayjs from "dayjs";
import mongoose from "mongoose";
import { Criterion } from "../models/Criteria.js";

/**
 * Obtiene la información de modelos disponibles.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const getNotifications = async (req, res) => {
  try {
    const result = await getNotificationsPayload({
      userId: req.uid,
    });

    return res.status(200).json(result);
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await markAllNotificationsAsReadFlow({
      userId: req.uid,
    });

    return res.status(200).json(result);
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const changeInvitationStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id, action } = req.body;
    let result = null;

    await session.withTransaction(async () => {
      result = await changeInvitationStatusFlow({
        issueId: id,
        userId: req.uid,
        action,
        session,
      });
    });

    return res.status(200).json(result);
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeNotificationById = async (req, res) => {
  try {
    const result = await removeNotificationForUserFlow({
      notificationId: req.body?.notificationId,
      userId: req.uid,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while removing notification"
        )
      );
  }
};

/**
 * Guarda borradores de evaluaciones pairwise del experto actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const submitPairwiseEvaluations = async (req, res) => {
  try {
    const result = await submitPairwiseEvaluationFlow({
      issueId: req.body?.id,
      userId: req.uid,
      evaluations: req.body?.evaluations,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    const payload = getErrorResponsePayload(
      error,
      "An error occurred while sending evaluations"
    );

    if (error?.criterion) {
      payload.criterion = error.criterion;
    }

    if (error?.row) {
      payload.row = error.row;
    }

    if (error?.col) {
      payload.col = error.col;
    }

    return res.status(getErrorStatusCode(error)).json(payload);
  }
};

/**
 * Resuelve un issue con evaluación pairwise y gestiona el flujo de consenso si aplica.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const saveDirectEvaluations = async (req, res) => {
  try {
    const { id, evaluations } = req.body;

    console.log(evaluations)

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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const submitDirectEvaluations = async (req, res) => {
  try {
    const result = await submitDirectEvaluationFlow({
      issueId: req.body?.id,
      userId: req.uid,
      evaluations: req.body?.evaluations,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    const payload = getErrorResponsePayload(
      error,
      "An error occurred while sending evaluations"
    );

    if (error?.alternative) {
      payload.alternative = error.alternative;
    }

    if (error?.criterion) {
      payload.criterion = error.criterion;
    }

    return res.status(getErrorStatusCode(error)).json(payload);
  }
};

/**
 * Resuelve un issue con evaluación directa y gestiona el flujo de consenso si aplica.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * Guarda borradores de pesos BWM del experto actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const saveBwmWeights = async (req, res) => {
  try {
    const result = await saveBwmWeightsDraftFlow({
      issueId: req.body?.id,
      userId: req.uid,
      bwmData: req.body?.bwmData,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("saveBwmWeights error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(error, "An error occurred while saving weights")
      );
  }
};

/**
 * Obtiene los pesos BWM guardados del experto actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const getBwmWeights = async (req, res) => {
  try {
    const result = await getBwmWeightsPayload({
      issueId: req.body?.id,
      userId: req.uid,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("getBwmWeights error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(error, "An error occurred while fetching weights")
      );
  }
};

/**
 * Valida y envía los pesos BWM del experto actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const sendBwmWeights = async (req, res) => {
  try {
    const result = await submitBwmWeightsFlow({
      issueId: req.body?.id,
      userId: req.uid,
      bwmData: req.body?.bwmData,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("sendBwmWeights error:", error);

    const payload = getErrorResponsePayload(
      error,
      "An error occurred while sending weights"
    );

    if (error?.field) {
      payload.field = error.field;
    }

    return res.status(getErrorStatusCode(error)).json(payload);
  }
};

/**
 * Calcula pesos BWM colectivos y actualiza el issue.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const computeWeights = async (req, res) => {
  try {
    const { id } = req.body;

    const result = await computeBwmCollectiveWeightsFlow({
      issueId: id,
      userId: req.uid,
      apiModelsBaseUrl: process.env.ORIGIN_APIMODELS || "http://localhost:7000",
      httpClient: axios,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("computeWeights error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while computing weights"
        )
      );
  }
};

/**
 * Guarda borradores de pesos manuales del experto actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const saveManualWeights = async (req, res) => {
  try {
    const result = await saveManualWeightsDraftFlow({
      issueId: req.body?.id,
      userId: req.uid,
      body: req.body,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("saveManualWeights error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(error, "An error occurred while saving")
      );
  }
};

/**
 * Obtiene los pesos manuales guardados del experto actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const getManualWeights = async (req, res) => {
  try {
    const result = await getManualWeightsPayload({
      issueId: req.body?.id,
      userId: req.uid,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("getManualWeights error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(error, "Error fetching manual weights")
      );
  }
};

/**
 * Valida y envía los pesos manuales del experto actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const sendManualWeights = async (req, res) => {
  try {
    const result = await submitManualWeightsFlow({
      issueId: req.body?.id,
      userId: req.uid,
      body: req.body,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("sendManualWeights error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(error, "Error submitting manual weights")
      );
  }
};
/**
 * Calcula pesos manuales colectivos y actualiza el issue.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const computeManualWeights = async (req, res) => {
  try {
    const { id } = req.body;

    const result = await computeManualCollectiveWeightsFlow({
      issueId: id,
      userId: req.uid,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("computeManualWeights error:", error);

    return res
      .status(getErrorStatusCode(error))
      .json(
        getErrorResponsePayload(
          error,
          "An error occurred while computing weights"
        )
      );
  }
};

/**
 * Crea un escenario de simulación para un issue resuelto.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
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