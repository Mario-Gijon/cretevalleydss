import mongoose from "mongoose";

import { sendExpertInvitationEmail } from "../../../services/email.service.js";
import { endSessionSafely } from "../../../utils/common/mongoose.js";
import { editIssueExperts } from "./editIssueExperts.js";

export const editIssueExpertsWorkflow = async ({
  issueId,
  userId,
  expertsToAdd,
  expertsToRemove,
  expertWeightsByEmail,
  hasExpertWeightsByEmail,
  sendInvitationEmail = sendExpertInvitationEmail,
  startSession = () => mongoose.startSession(),
  editExperts = editIssueExperts,
  beforeSessionCleanup = (result) => result,
}) => {
  const session = await startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await editExperts({
        issueId,
        userId,
        expertsToAdd,
        expertsToRemove,
        expertWeightsByEmail,
        hasExpertWeightsByEmail,
        session,
      });
    });

    for (const emailPayload of result.invitationEmailsToSend) {
      try {
        await sendInvitationEmail(emailPayload);
      } catch (error) {
        console.error(
          "Failed sending invitation email:",
          emailPayload.expertEmail,
          error
        );
      }
    }

    return await beforeSessionCleanup(result);
  } finally {
    await endSessionSafely(session);
  }
};
