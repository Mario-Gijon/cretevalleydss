import { User } from "../../../models/Users.js";

import { sendExpertInvitationEmail } from "../../../services/email.service.js";
import { normalizeEmail } from "../../../utils/common/strings.js";
import {
  addExpertsToActiveIssue,
  removeExpertsFromActiveIssue,
} from "./applyParticipantEdition.js";
import {
  loadParticipantEditionContext,
  normalizeParticipantEditionRequest,
} from "./loadParticipantEditionContext.js";

const notifyParticipantChanges = async ({
  invitationEmailsToSend,
  issue,
  admin,
}) => {
  for (const email of invitationEmailsToSend) {
    try {
      await sendExpertInvitationEmail({
        expertEmail: email,
        issueName: issue.name,
        issueDescription: issue.description,
        adminEmail: admin?.email || "",
      });
    } catch (error) {
      console.error("Failed sending invitation email:", email, error);
    }
  }
};

export const editIssueExperts = async ({
  issueId,
  userId,
  expertsToAdd = [],
  expertsToRemove = [],
}) => {
  const {
    finalExpertsToAdd,
    finalExpertsToRemove,
  } = normalizeParticipantEditionRequest({
    expertsToAdd,
    expertsToRemove,
  });

  const context = await loadParticipantEditionContext({
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
  });

  await removeExpertsFromActiveIssue({
    issue: context.issue,
    expertEmails: finalExpertsToRemove,
    userByEmail,
    currentPhase: context.currentPhase,
    stageForLog: context.stageForLog,
  });

  await notifyParticipantChanges({
    invitationEmailsToSend,
    issue: context.issue,
    admin: context.admin,
  });

  return {
    issueName: context.issue.name,
  };
};
