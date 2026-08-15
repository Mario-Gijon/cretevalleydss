import mongoose from "mongoose";

import { sendExpertInvitationEmail } from "../../../services/email.service.js";
import { endSessionSafely } from "../../../utils/common/mongoose.js";
import {
  persistPreparedIssueCreation,
  prepareIssueCreation,
} from "./createIssue.js";
import { createIssueEventOperationMetadata } from "../events/index.js";

const sendInvitationEmails = async ({ emailsToSend, sendInvitationEmail }) => {
  for (const emailPayload of emailsToSend) {
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
};

export const createIssueWorkflow = async ({
  issueInfo,
  ownerUserId,
  sendInvitationEmail = sendExpertInvitationEmail,
  startSession = () => mongoose.startSession(),
  prepare = prepareIssueCreation,
  persist = persistPreparedIssueCreation,
  beforeSessionCleanup = (result) => result,
}) => {
  const preparedIssueCreation = await prepare({
    issueInfo,
    ownerUserId,
  });
  const eventMetadata = createIssueEventOperationMetadata();
  const session = await startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await persist({
        preparedIssueCreation,
        ...eventMetadata,
        session,
      });
    });

    await sendInvitationEmails({
      emailsToSend: result.emailsToSend,
      sendInvitationEmail,
    });

    return await beforeSessionCleanup({
      issueName: result.issueName,
    });
  } finally {
    await endSessionSafely(session);
  }
};
