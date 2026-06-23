import { Issue } from "../models/Issues.js";
import { IssueModel } from "../models/IssueModels.js";
import { User } from "../models/Users.js";

import {
  getUserFinishedIssueIds,
} from "../modules/issues/shared/queries.js";
import { sendExpertInvitationEmail } from "../services/email.service.js";
import {
  createConflictError,
} from "../utils/common/errors.js";
import { sameId, toIdString } from "../utils/common/ids.js";
import { endSessionSafely } from "../utils/common/mongoose.js";
import { sendSuccess } from "../utils/common/responses.js";
import {
  computeIssueEvaluationStage,
} from "../modules/issues/computation/index.js";
import {
  getIssueEvaluationPayload,
  saveIssueEvaluationDraft,
  submitIssueEvaluation,
} from "../modules/issues/evaluations/index.js";

import {
  getActiveIssuesPayload,
} from "../modules/issues/active/index.js";
import {
  createIssueScenario as createIssueScenarioUseCase,
  getIssueScenariosPayload,
  getScenarioByIdPayload,
  removeIssueScenario,
} from "../modules/issues/scenarios/index.js";
import {
  deleteActiveIssueAsOwner,
  hideFinishedIssueForUser,
  leaveActiveIssue,
} from "../modules/issues/lifecycle/index.js";
import {
  createUserExpressionDomain,
  getExpressionDomainsPayload,
  removeUserExpressionDomain,
  updateUserExpressionDomain,
} from "../modules/expressionDomains/index.js";
import {
  getNotificationsPayload,
  markAllNotificationsAsRead as markAllNotificationsAsReadUseCase,
  respondToIssueInvitation as respondToIssueInvitationUseCase,
  removeNotificationForUser as removeNotificationForUserUseCase,
} from "../modules/issues/notifications/index.js";
import { getFinishedIssueInfoPayload } from "../modules/issues/finished/getFinishedIssueInfoPayload.js";
import { editIssueExperts as editIssueExpertsUseCase } from "../modules/issues/participants/index.js";
import {
  persistPreparedIssueCreation,
  prepareIssueCreation,
} from "../modules/issues/creation/index.js";

import axios from "axios";
import mongoose from "mongoose";

export const modelsInfo = async (req, res) => {
  const models = await IssueModel.find({
    $and: [
      {
        $or: [
          {
            modelKind: "issue",
            visibleInIssueCreation: true,
          },
          {
            modelKind: "criteriaWeighting",
            visibleInCriteriaWeighting: true,
          },
        ],
      },
      { "manifestSync.isStale": false },
    ],
  })
    .select("-__v")
    .lean();
  const issueModels = models.filter((model) => model.modelKind === "issue");
  const criteriaWeightingModels = models.filter(
    (model) => model.modelKind === "criteriaWeighting"
  );

  return sendSuccess(res, "Models fetched successfully", {
    models: issueModels,
    criteriaWeightingModels,
  });
};

export const getAllUsers = async (req, res) => {
  const users = await User.find({ accountConfirm: true })
    .select("name university email")
    .lean();

  return sendSuccess(res, "Users fetched successfully", users);
};

export const getExpressionsDomain = async (req, res) => {
  const data = await getExpressionDomainsPayload({
    userId: req.uid,
  });

  return sendSuccess(res, "Expression domains fetched successfully", data);
};

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

export const createIssue = async (req, res) => {
  const issueInfo = req.body.issueInfo;
  const preparedIssueCreation = await prepareIssueCreation({
    issueInfo,
    ownerUserId: req.uid,
    decisionModelsServiceBaseUrl:
      process.env.DECISION_MODELS_SERVICE_BASE_URL || "http://localhost:7000",
    httpClient: axios,
  });

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await persistPreparedIssueCreation({
        preparedIssueCreation,
        session,
      });
    });

    for (const emailPayload of result.emailsToSend) {
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
      `Issue ${result.issueName} created successfully`,
      {
        issueName: result.issueName,
      },
      201
    );
  } finally {
    await endSessionSafely(session);
  }
};

export const getAllActiveIssues = async (req, res) => {
  const payload = await getActiveIssuesPayload({
    userId: req.uid,
  });

  return sendSuccess(res, "Active issues fetched successfully", payload);
};

export const removeIssue = async (req, res) => {
  const id = req.params.id;
  const userId = req.uid;

  const session = await mongoose.startSession();

  try {
    let removedIssueName = "";

    await session.withTransaction(async () => {
      const result = await deleteActiveIssueAsOwner({
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

export const removeExpressionDomain = async (req, res) => {
  const id = req.params.id;

  await removeUserExpressionDomain({
    domainId: id,
    userId: req.uid,
  });

  return sendSuccess(res, "Domain deleted", { id });
};

export const updateExpressionDomain = async (req, res) => {
  const id = req.params.id;
  const updatedDomain = req.body.updatedDomain;
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

export const getAllFinishedIssues = async (req, res) => {
  const userId = toIdString(req.uid);
  const issueIds = await getUserFinishedIssueIds(userId);

  if (issueIds.length === 0) {
    return sendSuccess(res, "Finished issues fetched successfully", []);
  }

  const issues = await Issue.find({ _id: { $in: issueIds } })
    .populate("model", "name")
    .populate("ownerId", "email")
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
    isIssueOwner: sameId(issue.ownerId?._id, userId),
  }));

  return sendSuccess(res, "Finished issues fetched successfully", formattedIssues);
};

export const getNotifications = async (req, res) => {
  const result = await getNotificationsPayload({
    userId: req.uid,
  });

  return sendSuccess(res, "Notifications fetched successfully", {
    notifications: result.notifications,
  });
};

export const markAllNotificationsAsRead = async (req, res) => {
  const result = await markAllNotificationsAsReadUseCase({
    userId: req.uid,
  });

  return sendSuccess(res, result.message);
};

export const changeInvitationStatus = async (req, res) => {
  const id = req.params.id;
  const action = req.body.action;
  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await respondToIssueInvitationUseCase({
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

export const removeNotificationById = async (req, res) => {
  const notificationId = req.params.notificationId;

  const result = await removeNotificationForUserUseCase({
    notificationId,
    userId: req.uid,
  });

  return sendSuccess(res, result.message, { notificationId });
};

export const removeFinishedIssue = async (req, res) => {
  const id = req.params.id;
  const userId = req.uid;

  const session = await mongoose.startSession();

  try {
    let removedIssueName = "";

    await session.withTransaction(async () => {
      const result = await hideFinishedIssueForUser({
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

export const editExperts = async (req, res) => {
  const id = req.params.id;
  const expertsToAdd = req.body.expertsToAdd;
  const expertsToRemove = req.body.expertsToRemove;

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await editIssueExpertsUseCase({
        issueId: id,
        userId: req.uid,
        expertsToAdd,
        expertsToRemove,
        session,
      });
    });

    for (const emailPayload of result.invitationEmailsToSend) {
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

    return sendSuccess(res, "Experts updated successfully.");
  } finally {
    await endSessionSafely(session);
  }
};

export const leaveIssue = async (req, res) => {
  const id = req.params.id;
  const userId = req.uid;

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await leaveActiveIssue({
        issueId: id,
        userId,
        session,
      });
    });

    return sendSuccess(res, "You have left the issue successfully", {
      issueName: result.issueName,
    });
  } finally {
    await endSessionSafely(session);
  }
};

export const getFinishedIssueInfo = async (req, res) => {
  const id = req.params.id;

  const issueInfo = await getFinishedIssueInfoPayload({
    issueId: id,
  });

  return sendSuccess(res, "Issue info sent", issueInfo);
};

export const createIssueScenario = async (req, res) => {
  const issueId = req.params.id;
  const targetModelId = req.body.targetModelId;
  const scenarioName = req.body.scenarioName;
  const paramOverrides = req.body.paramOverrides;

  const { scenarioId } = await createIssueScenarioUseCase({
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

export const getIssueScenarios = async (req, res) => {
  const issueId = req.params.id;

  const { scenarios } = await getIssueScenariosPayload({ issueId });

  return sendSuccess(res, "Scenarios fetched successfully", scenarios);
};

export const getScenarioById = async (req, res) => {
  const scenarioId = req.params.scenarioId;

  const { scenario } = await getScenarioByIdPayload({ scenarioId });

  return sendSuccess(res, "Scenario fetched successfully", scenario);
};

export const removeScenario = async (req, res) => {
  const scenarioId = req.params.scenarioId;

  await removeIssueScenario({
    scenarioId,
    userId: req.uid,
  });

  return sendSuccess(res, "Scenario deleted", { scenarioId });
};

export const getIssueEvaluationByStage = async (req, res) => {
  const issueId = req.params.id;
  const stage = req.params.stage;

  const result = await getIssueEvaluationPayload({
    issueId,
    userId: req.uid,
    stage,
  });

  return sendSuccess(res, "Evaluation fetched successfully", result);
};

export const saveIssueEvaluationByStage = async (req, res) => {
  const issueId = req.params.id;
  const stage = req.params.stage;
  const payload = req.body.payload;

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
  const issueId = req.params.id;
  const stage = req.params.stage;
  const payload = req.body.payload;

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await submitIssueEvaluation({
        issueId,
        userId: req.uid,
        stage,
        payload,
        session,
      });
    });

    return sendSuccess(res, result.message, {
      stage: result.stage,
      structureKey: result.structureKey,
      consensusPhase: result.consensusPhase,
      completed: result.completed,
      currentStage: result.currentStage,
    });
  } finally {
    await endSessionSafely(session);
  }
};

export const computeEvaluationStage = async (req, res) => {
  const issueId = req.params.id;
  const stage = req.params.stage;

  const result = await computeIssueEvaluationStage({
    issueId,
    userId: req.uid,
    stage,
    decisionModelsServiceBaseUrl:
      process.env.DECISION_MODELS_SERVICE_BASE_URL || "http://localhost:7000",
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
