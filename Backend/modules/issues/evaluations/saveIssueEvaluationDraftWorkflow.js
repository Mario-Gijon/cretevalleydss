import { runWithTransaction } from "../../../utils/common/mongoose.js";
import { saveIssueEvaluationDraft } from "./saveIssueEvaluationDraft.js";

export const saveIssueEvaluationDraftWorkflow = ({
  issueId,
  userId,
  stage,
  payload,
  beforeSessionCleanup,
}) =>
  runWithTransaction(
    (session) =>
      saveIssueEvaluationDraft({
        issueId,
        userId,
        stage,
        payload,
        session,
      }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );
