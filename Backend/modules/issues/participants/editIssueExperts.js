import { User } from "../../../models/Users.js";

import { normalizeEmail } from "../../../utils/common/strings.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import {
  addExpertsToActiveIssue,
  removeExpertsFromActiveIssue,
} from "./applyParticipantEdition.js";
import {
  loadParticipantEditionContext,
  normalizeParticipantEditionRequest,
} from "./loadParticipantEditionContext.js";

export const editIssueExperts = async ({
  issueId,
  userId,
  expertsToAdd,
  expertsToRemove,
  session = null,
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
    session,
  });

  if (finalExpertsToRemove.includes(normalizeEmail(context.owner.email))) {
    throw createBadRequestError("Issue owner cannot be removed", {
      field: "expertsToRemove",
    });
  }

  const allEmailsToFetch = Array.from(
    new Set([...finalExpertsToAdd, ...finalExpertsToRemove])
  );

  const users = allEmailsToFetch.length
    ? await User.find({ email: { $in: allEmailsToFetch } }).session(session).lean()
    : [];

  const userByEmail = new Map(
    users.map((user) => [normalizeEmail(user.email), user])
  );

  const invitationEmailsToSend = await addExpertsToActiveIssue({
    issue: context.issue,
    owner: context.owner,
    userId,
    expertEmails: finalExpertsToAdd,
    userByEmail,
    leafCriteria: context.leafCriteria,
    currentPhase: context.currentPhase,
    stageForLog: context.stageForLog,
    session,
  });

  await removeExpertsFromActiveIssue({
    issue: context.issue,
    expertEmails: finalExpertsToRemove,
    userByEmail,
    currentPhase: context.currentPhase,
    stageForLog: context.stageForLog,
    session,
  });

  return {
    issueName: context.issue.name,
    invitationEmailsToSend: invitationEmailsToSend.map((expertEmail) => ({
      expertEmail,
      issueName: context.issue.name,
      issueDescription: context.issue.description,
      ownerEmail: context.owner.email,
    })),
  };
};
