         
import { Issue } from "../../../models/Issues.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { ISSUE_STAGES } from "../../decisionEngine/evaluations/evaluation.constants.js";

        
import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

const PARTICIPATION_ENTRY_STAGES = Object.freeze({
  CRITERIA_WEIGHTING: "criteriaWeighting",
  ALTERNATIVE_EVALUATION: "alternativeEvaluation",
});

const resolveParticipationEntryStage = (issueStage) => {
  if (
    issueStage === ISSUE_STAGES.CRITERIA_WEIGHTING ||
    issueStage === ISSUE_STAGES.WEIGHTS_FINISHED
  ) {
    return PARTICIPATION_ENTRY_STAGES.CRITERIA_WEIGHTING;
  }

  if (
    issueStage === ISSUE_STAGES.ALTERNATIVE_EVALUATION ||
    issueStage === ISSUE_STAGES.FINISHED
  ) {
    return PARTICIPATION_ENTRY_STAGES.ALTERNATIVE_EVALUATION;
  }

  return null;
};


const getNotificationResponseStatus = (participation) => {
  if (!participation) {
    return false;
  }

  if (participation.invitationStatus === "accepted") {
    return "Invitation accepted";
  }

  if (participation.invitationStatus === "declined") {
    return "Invitation declined";
  }

  return false;
};

const buildNotificationItem = ({ notification, participationByIssueId }) => {
  const issueId = toIdString(notification.issue?._id);
  const participation = issueId ? participationByIssueId.get(issueId) : null;

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
    issueId: issueId || null,
    requiresAction: notification.requiresAction,
    read: notification.read ?? false,
    createdAt: notification.createdAt,
    responseStatus: getNotificationResponseStatus(participation),
  };
};

export const getNotificationsPayload = async ({ userId }) => {
  const [notifications, participations] = await Promise.all([
    Notification.find({ expert: userId })
      .sort({ createdAt: -1 })
      .populate("expert", "email")
      .populate("issue", "name")
      .lean(),
    Participation.find({ expert: userId }).lean(),
  ]);

  const participationByIssueId = new Map(
    participations
      .map((participation) => [toIdString(participation.issue), participation])
      .filter(([issueId]) => issueId)
  );

  return {
    notifications: notifications.map((notification) =>
      buildNotificationItem({
        notification,
        participationByIssueId,
      })
    ),
  };
};

export const markAllNotificationsAsReadFlow = async ({ userId }) => {
  await Notification.updateMany({ expert: userId, read: false }, { read: true });

  return {
    message: "Notifications marked as read",
  };
};

export const changeInvitationStatusFlow = async ({
  issueId,
  userId,
  action,
  session = null,
}) => {
  if (!issueId) {
    throw createBadRequestError("Issue id is required");
  }

  if (action !== "accepted" && action !== "declined") {
    throw createBadRequestError("Invalid invitation action", {
      field: "action",
    });
  }

  const issue = await Issue.findById(issueId)
    .select(
      "_id name currentStage consensusPhase criteriaWeightingStructureKey leafCriteriaOrder"
    )
    .session(session);

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
    const leafCriteriaCount = Array.isArray(issue.leafCriteriaOrder)
      ? issue.leafCriteriaOrder.length
      : 0;
    const isSingleCriterion = leafCriteriaCount === 1;
    const criteriaWeightingIsOpen =
      issue.currentStage === ISSUE_STAGES.CRITERIA_WEIGHTING ||
      issue.currentStage === ISSUE_STAGES.WEIGHTS_FINISHED;
    const requiresCriteriaWeighting = Boolean(issue.criteriaWeightingStructureKey);

    participation.evaluationCompleted = false;
    if (criteriaWeightingIsOpen && requiresCriteriaWeighting) {
      participation.weightsCompleted = isSingleCriterion;
    }
    participation.joinedAt = new Date();
    participation.entryPhase = Number.isInteger(issue.consensusPhase)
      ? issue.consensusPhase
      : null;
    participation.entryStage = resolveParticipationEntryStage(issue.currentStage);
  }

  await participation.save({ session });

  return {
    message:
      action === "accepted"
        ? `Invitation to issue ${issue.name} accepted`
        : `Invitation to issue ${issue.name} declined`,
  };
};

export const removeNotificationForUserFlow = async ({
  notificationId,
  userId,
}) => {
  if (!notificationId) {
    throw createBadRequestError("Notification id is required", {
      field: "notificationId",
    });
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    expert: userId,
  });

  if (!notification) {
    throw createNotFoundError("Notification not found");
  }

  await Notification.deleteOne({ _id: notification._id });

  return {
    message: "Notification removed successfully",
  };
};
