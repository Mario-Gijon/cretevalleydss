import { runWithTransaction } from "../../../utils/common/mongoose.js";
import { submitIssueEvaluation } from "./submitIssueEvaluation.js";
import { createIssueEventOperationMetadata } from "../events/index.js";

export const submitIssueEvaluationWorkflow = ({
  issueId,
  userId,
  stage,
  payload,
  beforeSessionCleanup,
}) =>
  (() => {
    const eventMetadata = createIssueEventOperationMetadata();

    return runWithTransaction(
    (session) =>
      submitIssueEvaluation({
        issueId,
        userId,
        stage,
        payload,
        ...eventMetadata,
        session,
      }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
    );
  })();
