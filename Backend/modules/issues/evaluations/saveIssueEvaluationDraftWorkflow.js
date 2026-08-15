import { runWithTransaction } from "../../../utils/common/mongoose.js";
import { saveIssueEvaluationDraft } from "./saveIssueEvaluationDraft.js";
import { createIssueEventOperationMetadata } from "../events/index.js";

export const saveIssueEvaluationDraftWorkflow = ({
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
      saveIssueEvaluationDraft({
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
