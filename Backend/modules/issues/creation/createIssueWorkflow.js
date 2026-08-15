import mongoose from "mongoose";

import { sendExpertInvitationEmail } from "../../../services/email.service.js";
import { endSessionSafely } from "../../../utils/common/mongoose.js";
import {
  persistPreparedIssueCreation,
  prepareIssueCreation,
} from "./createIssue.js";
import { createIssueEventOperationMetadata } from "../events/index.js";
import { IssueExecutionAttempt } from "../../../models/IssueExecutionAttempts.js";
import { markExecutionApplied, markExecutionApplicationFailed } from "../modelExecution/index.js";

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

    try {
      await session.withTransaction(async () => {
        result = await persist({
          preparedIssueCreation,
          ...eventMetadata,
          session,
        });
      });
    } catch (error) {
      const attempt = await IssueExecutionAttempt.findOne({ scope: "issueCreation", correlationId: eventMetadata.correlationId, status: "succeeded", "application.status": "pending" }).sort({ startedAt: -1, _id: -1 });
      if (attempt) await markExecutionApplicationFailed({ attemptId: attempt._id, error });
      throw error;
    }
    if (result.executionAttemptId) {
      await IssueExecutionAttempt.updateOne({ _id: result.executionAttemptId, issue: null }, { $set: { issue: result.issueId } });
      await markExecutionApplied({ attemptId: result.executionAttemptId, entityType: "issue", entityId: result.issueId, resultSnapshot: { weights: result.initialWeights } });
    }

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
