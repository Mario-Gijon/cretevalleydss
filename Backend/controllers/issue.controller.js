
import { Alternative } from "../models/Alternatives.js";
import { Consensus } from "../models/Consensus.js";
import { Criterion } from "../models/Criteria.js";
import { Issue } from "../models/Issues.js";
import { IssueModel } from "../models/IssueModels.js";
import { Participation } from "../models/Participations.js";
import { User } from "../models/Users.js";


import {
  getUserFinishedIssueIds,
  getVisibleActiveIssueIdsForUser,
} from "../modules/issues/issue.queries.js";
import { sendExpertInvitationEmail } from "../services/email.service.js";
import {
  createConflictError,
} from "../utils/common/errors.js";
import { sameId, toIdString } from "../utils/common/ids.js";
import { endSessionSafely } from "../utils/common/mongoose.js";
import { sendSuccess } from "../utils/common/responses.js";
import {
  computeIssueEvaluationStage,
  getIssueEvaluationPayload,
  saveIssueEvaluationDraft,
  submitIssueEvaluation,
} from "../modules/issues/evaluations/index.js";


import {
  buildActiveIssueCollections,
  buildActiveIssueView,
  buildActiveIssuesResponseMeta,
  buildEmptyActiveIssuesPayload,
  getEmptyTasksByType,
  sortActiveIssues,
  sortActiveTasksByType,
} from "../modules/issues/active/index.js";
import {
  createIssueScenarioFlow,
  getIssueScenariosPayload,
  getScenarioByIdPayload,
  removeIssueScenarioFlow,
} from "../modules/issues/scenarios/index.js";
import {
  deleteActiveIssueAsAdmin,
  hideFinishedIssueForUserFlow,
  leaveActiveIssueFlow,
} from "../modules/issues/lifecycle/index.js";
import {
  createUserExpressionDomain,
  getExpressionDomainsPayload,
  removeUserExpressionDomain,
  updateUserExpressionDomain,
} from "../modules/issues/expressionDomains/issueExpressionDomains.js";
import {
  changeInvitationStatusFlow,
  getNotificationsPayload,
  markAllNotificationsAsReadFlow,
  removeNotificationForUserFlow,
} from "../modules/issues/notifications/index.js";
import { getFinishedIssueInfoPayload } from "../modules/issues/finished/finishedIssue.payload.js";
import { editIssueExpertsFlow } from "../modules/issues/participants/index.js";
import { createIssueFlow } from "../modules/issues/creation/index.js";


import axios from "axios";
import dayjs from "dayjs";
import mongoose from "mongoose";

/**
 * Obtiene la información de modelos disponibles.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const modelsInfo = async (req, res) => {
  const models = await IssueModel.find({
    $and: [
      {
        isIssueModel: true,
      },
      {
        $or: [
          { visibleInIssueCreation: { $exists: false } },
          { visibleInIssueCreation: { $ne: false } },
        ],
      },
      {
        $or: [
          { manifestSync: { $exists: false } },
          { "manifestSync.isStale": { $exists: false } },
          { "manifestSync.isStale": false },
        ],
      },
    ],
  })
    .select("-__v")
    .lean();

  return sendSuccess(res, "Models fetched successfully", models);
};

/**
 * Obtiene todos los usuarios visibles para la creación de issues.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllUsers = async (req, res) => {
  const users = await User.find({ accountConfirm: true })
    .select("name university email")
    .lean();

  return sendSuccess(res, "Users fetched successfully", users);
};

/**
 * Obtiene los dominios de expresión globales y del usuario actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const getExpressionsDomain = async (req, res) => {
  const data = await getExpressionDomainsPayload({
    userId: req.uid,
  });

  return sendSuccess(res, "Expression domains fetched successfully", data);
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

    return sendSuccess(
      res,
      `Domain ${newDomain.name} created successfully`,
      newDomain,
      201
    );
  } catch (error) {
    if (error?.code === 11000) {
      throw createConflictError(
        "A domain with the same name already exists (for this user).",
        {
          field: "name",
          details: error?.keyValue ?? null,
          cause: error,
        }
      );
    }

    throw error;
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
        apiModelsBaseUrl:
          process.env.ORIGIN_APIMODELS || "http://localhost:7000",
        httpClient: axios,
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

    return sendSuccess(
      res,
      `Issue ${result?.issueName || ""} created successfully`,
      {
        issueName: result?.issueName || null,
      },
      201
    );
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

  const { issueIds, adminIssueIds } = await getVisibleActiveIssueIdsForUser(
    userId
  );

  if (issueIds.length === 0) {
    return sendSuccess(
      res,
      "Active issues fetched successfully",
      buildEmptyActiveIssuesPayload()
    );
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
      Criterion.find({ issue: { $in: issueIds } })
        .populate(
          "expressionDomain",
          "name type numericRange valueCount linguisticLabels"
        )
        .lean(),
      Consensus.find({ issue: { $in: issueIds } }).lean(),
    ]);

  const {
    participationMap,
    alternativesMap,
    criteriaMap,
    consensusHistoryByIssue,
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
      consensusHistoryRounds: consensusHistoryByIssue[issueId] || [],
      dayjsLib: dayjs,
    });

    for (const taskItem of taskItems) {
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

  return sendSuccess(res, "Active issues fetched successfully", {
    issues: formattedIssues,
    tasks,
    taskCenter,
    filtersMeta,
  });
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

    return sendSuccess(res, `Issue ${removedIssueName} removed`, {
      issueName: removedIssueName,
    });
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

  await removeUserExpressionDomain({
    domainId: id,
    userId: req.uid,
  });

  return sendSuccess(res, "Domain deleted", { id });
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

    return sendSuccess(res, "Domain updated successfully", updated);
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
  const userId = toIdString(req.uid);
  const issueIds = await getUserFinishedIssueIds(userId);

  if (issueIds.length === 0) {
    return sendSuccess(res, "Finished issues fetched successfully", []);
  }

  const issues = await Issue.find({ _id: { $in: issueIds } })
    .populate("model", "name")
    .populate("admin", "email")
    .sort({ finishedAt: -1, updatedAt: -1 })
    .lean();

  const formattedIssues = issues.map((issue) => ({
    id: toIdString(issue._id),
    name: issue.name,
    description: issue.description,
    creationDate: issue.creationDate,
    createdAt: issue.createdAt ?? null,
    updatedAt: issue.updatedAt ?? null,
    closureDate: issue.closureDate ?? null,
    finishedAt: issue.finishedAt ?? null,
    isAdmin: sameId(issue.admin?._id, userId),
  }));

  return sendSuccess(res, "Finished issues fetched successfully", formattedIssues);
};

/**
 * Obtiene las notificaciones del usuario actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const getNotifications = async (req, res) => {
  const result = await getNotificationsPayload({
    userId: req.uid,
  });

  return sendSuccess(res, "Notifications fetched successfully", {
    notifications: result.notifications,
  });
};

/**
 * Marca como leídas todas las notificaciones no leídas del usuario actual.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const markAllNotificationsAsRead = async (req, res) => {
  const result = await markAllNotificationsAsReadFlow({
    userId: req.uid,
  });

  return sendSuccess(res, result.message);
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

    return sendSuccess(res, result.message);
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
  const notificationId = req.body?.notificationId;

  const result = await removeNotificationForUserFlow({
    notificationId,
    userId: req.uid,
  });

  return sendSuccess(res, result.message, { notificationId });
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

    return sendSuccess(res, `Issue ${removedIssueName} removed`, {
      issueName: removedIssueName,
    });
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

  await editIssueExpertsFlow({
    issueId: id,
    userId: req.uid,
    expertsToAdd,
    expertsToRemove,
  });

  return sendSuccess(res, "Experts updated successfully.");
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
    let result = null;

    await session.withTransaction(async () => {
      result = await leaveActiveIssueFlow({
        issueId: id,
        userId,
        session,
      });
    });

    return sendSuccess(res, "You have left the issue successfully", {
      issueName: result?.issueName || null,
    });
  } finally {
    await endSessionSafely(session);
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
  const { id } = req.body;

  const issueInfo = await getFinishedIssueInfoPayload({
    issueId: id,
  });

  return sendSuccess(res, "Issue info sent", issueInfo);
};

/**
 * Crea un escenario de simulación para un issue resuelto.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const createIssueScenario = async (req, res) => {
  const {
    issueId,
    targetModelId,
    scenarioName = "",
    paramOverrides = {},
  } = req.body || {};

  const { scenarioId } = await createIssueScenarioFlow({
    userId: req.uid,
    issueId,
    targetModelId,
    scenarioName,
    paramOverrides,
  });

  return sendSuccess(
    res,
    "Scenario created successfully",
    {
      scenarioId,
    },
    201
  );
};

/**
 * Lista los escenarios creados para un issue.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueScenarios = async (req, res) => {
  const { issueId } = req.body;

  const { scenarios } = await getIssueScenariosPayload({ issueId });

  return sendSuccess(res, "Scenarios fetched successfully", scenarios);
};

/**
 * Obtiene un escenario por su id.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const getScenarioById = async (req, res) => {
  const { scenarioId } = req.body;

  const { scenario } = await getScenarioByIdPayload({ scenarioId });

  return sendSuccess(res, "Scenario fetched successfully", scenario);
};

/**
 * Elimina un escenario si el usuario actual es su creador o admin del issue.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeScenario = async (req, res) => {
  const { scenarioId } = req.body;

  await removeIssueScenarioFlow({
    scenarioId,
    userId: req.uid,
  });

  return sendSuccess(res, "Scenario deleted", { scenarioId });
};

export const getIssueEvaluationByStage = async (req, res) => {
  const issueId = req.params?.id || req.body?.id;
  const stage = req.params?.stage;

  const result = await getIssueEvaluationPayload({
    issueId,
    userId: req.uid,
    stage,
  });

  return sendSuccess(res, "Evaluation fetched successfully", result);
};

export const saveIssueEvaluationByStage = async (req, res) => {
  const issueId = req.params?.id || req.body?.id;
  const stage = req.params?.stage;
  const payload = req.body?.payload;

  const result = await saveIssueEvaluationDraft({
    issueId,
    userId: req.uid,
    stage,
    payload,
  });

  return sendSuccess(res, result.message, {
    stage: result.stage,
    structureKey: result.structureKey,
    consensusPhase: result.consensusPhase,
    completed: result.completed,
  });
};

export const submitIssueEvaluationByStage = async (req, res) => {
  const issueId = req.params?.id || req.body?.id;
  const stage = req.params?.stage;
  const payload = req.body?.payload;

  const result = await submitIssueEvaluation({
    issueId,
    userId: req.uid,
    stage,
    payload,
  });

  return sendSuccess(res, result.message, {
    stage: result.stage,
    structureKey: result.structureKey,
    consensusPhase: result.consensusPhase,
    completed: result.completed,
    currentStage: result.currentStage,
  });
};

export const computeEvaluationStage = async (req, res) => {
  const issueId = req.params?.id || req.body?.id;
  const stage = req.params?.stage;

  const result = await computeIssueEvaluationStage({
    issueId,
    userId: req.uid,
    stage,
    apiModelsBaseUrl: process.env.ORIGIN_APIMODELS || "http://localhost:7000",
    httpClient: axios,
  });

  return sendSuccess(res, result.message, {
    stage: result.stage,
    structureKey: result.structureKey,
    consensusPhase: result.consensusPhase,
    currentStage: result.currentStage,
    result: result.result,
  });
};
