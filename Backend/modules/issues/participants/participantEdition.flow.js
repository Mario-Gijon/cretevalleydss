import { Issue } from "../../../models/Issues.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { User } from "../../../models/Users.js";

import {
  cleanupExpertDraftsOnExit,
  mapIssueStageToExitStage,
  registerUserExit,
} from "../lifecycle/index.js";

import {
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";
import { normalizeEmail } from "../../../utils/common/strings.js";
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "../issue.ordering.js";
import { sendExpertInvitationEmail } from "../../../services/email.service.js";

const normalizeExpertEditionRequest = ({
  expertsToAdd = [],
  expertsToRemove = [],
}) => {
  const normalizedExpertsToAdd = Array.from(
    new Set((expertsToAdd || []).map(normalizeEmail).filter(Boolean))
  );

  const normalizedExpertsToRemove = Array.from(
    new Set((expertsToRemove || []).map(normalizeEmail).filter(Boolean))
  );

  const removeSet = new Set(normalizedExpertsToRemove);

  const finalExpertsToAdd = normalizedExpertsToAdd.filter(
    (email) => !removeSet.has(email)
  );

  const finalExpertsToRemove = normalizedExpertsToRemove.filter(
    (email) => !finalExpertsToAdd.includes(email)
  );

  return {
    finalExpertsToAdd,
    finalExpertsToRemove,
  };
};

const getEditExpertsContext = async ({ issueId, userId }) => {
  const issue = await Issue.findById(issueId).populate("model");

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError("Not authorized to edit this issue's experts.");
  }

  await ensureIssueOrdersDb({ issueId: issue._id });

  const [leafCriteria, admin] = await Promise.all([
    getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    }),
    User.findById(userId).select("name email").lean(),
  ]);

  return {
    issue,
    admin,
    leafCriteria,
    currentPhase: issue.consensusPhase,
    stageForLog: mapIssueStageToExitStage(issue.currentStage),
    weightsStageIsOpen:
      issue.currentStage === "criteriaWeighting" ||
      issue.currentStage === "weightsFinished",
  };
};

const addExpertsToActiveIssue = async ({
  issue,
  admin,
  userId,
  expertEmails,
  userByEmail,
  leafCriteria,
  currentPhase,
  stageForLog,
  weightsStageIsOpen,
}) => {
  const invitationEmailsToSend = [];

  for (const email of expertEmails) {
    const expertUser = userByEmail.get(email);
    if (!expertUser) continue;

    const existingParticipation = await Participation.findOne({
      issue: issue._id,
      expert: expertUser._id,
    });

    if (existingParticipation) continue;

    const isAdminExpert = sameId(expertUser._id, userId);
    const weightsCompleted = leafCriteria.length === 1;

    await Participation.create({
      issue: issue._id,
      expert: expertUser._id,
      invitationStatus: isAdminExpert ? "accepted" : "pending",
      evaluationCompleted: false,
      weightsCompleted,
      entryPhase: currentPhase,
      entryStage: stageForLog,
      joinedAt: new Date(),
    });

    if (!isAdminExpert) {
      await Notification.create({
        expert: expertUser._id,
        issue: issue._id,
        type: "invitation",
        message: `You have been invited by ${
          admin?.name || admin?.email || "admin"
        } to participate in ${issue.name}.`,
        read: false,
        requiresAction: true,
      });

      invitationEmailsToSend.push(email);
    }
  }

  return invitationEmailsToSend;
};

const removeExpertsFromActiveIssue = async ({
  issue,
  expertEmails,
  userByEmail,
  currentPhase,
  stageForLog,
}) => {
  for (const email of expertEmails) {
    const expertUser = userByEmail.get(email);
    if (!expertUser) continue;

    if (sameId(expertUser._id, issue.admin)) continue;

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: expertUser._id,
    });

    if (!participation) continue;

    await cleanupExpertDraftsOnExit({
      issueId: issue._id,
      expertId: expertUser._id,
    });

    await Participation.deleteOne({ _id: participation._id });

    await registerUserExit({
      issueId: issue._id,
      userId: expertUser._id,
      phase: currentPhase,
      stage: stageForLog,
      reason: "Expelled by admin",
    });
  }
};

export const editIssueExpertsFlow = async ({
  issueId,
  userId,
  expertsToAdd = [],
  expertsToRemove = [],
}) => {
  const {
    finalExpertsToAdd,
    finalExpertsToRemove,
  } = normalizeExpertEditionRequest({
    expertsToAdd,
    expertsToRemove,
  });

  const context = await getEditExpertsContext({
    issueId,
    userId,
  });

  const allEmailsToFetch = Array.from(
    new Set([...finalExpertsToAdd, ...finalExpertsToRemove])
  );

  const users = allEmailsToFetch.length
    ? await User.find({ email: { $in: allEmailsToFetch } }).lean()
    : [];

  const userByEmail = new Map(
    users.map((user) => [normalizeEmail(user.email), user])
  );

  const invitationEmailsToSend = await addExpertsToActiveIssue({
    issue: context.issue,
    admin: context.admin,
    userId,
    expertEmails: finalExpertsToAdd,
    userByEmail,
    leafCriteria: context.leafCriteria,
    currentPhase: context.currentPhase,
    stageForLog: context.stageForLog,
    weightsStageIsOpen: context.weightsStageIsOpen,
  });

  await removeExpertsFromActiveIssue({
    issue: context.issue,
    expertEmails: finalExpertsToRemove,
    userByEmail,
    currentPhase: context.currentPhase,
    stageForLog: context.stageForLog,
  });

  for (const email of invitationEmailsToSend) {
    try {
      await sendExpertInvitationEmail({
        expertEmail: email,
        issueName: context.issue.name,
        issueDescription: context.issue.description,
        adminEmail: context.admin?.email || "",
      });
    } catch (error) {
      console.error("Failed sending invitation email:", email, error);
    }
  }

  return {
    issueName: context.issue.name,
  };
};
