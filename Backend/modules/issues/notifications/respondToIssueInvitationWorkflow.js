import { runWithTransaction } from "../../../utils/common/mongoose.js";
import { respondToIssueInvitation } from "./respondToIssueInvitation.js";
import { createIssueEventOperationMetadata } from "../events/index.js";

export const respondToIssueInvitationWorkflow = ({
  issueId,
  userId,
  action,
  beforeSessionCleanup,
}) =>
  (() => {
    const eventMetadata = createIssueEventOperationMetadata();

    return runWithTransaction(
    (session) =>
      respondToIssueInvitation({
        issueId,
        userId,
        action,
        ...eventMetadata,
        session,
      }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
    );
  })();
