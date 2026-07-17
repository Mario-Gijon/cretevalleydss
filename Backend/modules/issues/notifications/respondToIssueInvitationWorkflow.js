import { runWithTransaction } from "../../../utils/common/mongoose.js";
import { respondToIssueInvitation } from "./respondToIssueInvitation.js";

export const respondToIssueInvitationWorkflow = ({
  issueId,
  userId,
  action,
  beforeSessionCleanup,
}) =>
  runWithTransaction(
    (session) =>
      respondToIssueInvitation({
        issueId,
        userId,
        action,
        session,
      }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );
