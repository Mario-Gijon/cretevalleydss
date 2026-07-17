import { runWithTransaction } from "../../../utils/common/mongoose.js";
import { submitIssueEvaluation } from "./submitIssueEvaluation.js";

export const submitIssueEvaluationWorkflow = ({
  issueId,
  userId,
  stage,
  payload,
  beforeSessionCleanup,
}) =>
  runWithTransaction(
    (session) =>
      submitIssueEvaluation({
        issueId,
        userId,
        stage,
        payload,
        session,
      }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );
