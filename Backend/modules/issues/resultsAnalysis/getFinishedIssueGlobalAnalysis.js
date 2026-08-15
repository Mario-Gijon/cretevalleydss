import { createBadRequestError } from "../../../utils/common/errors.js";
import { requestGenericIssueAnalysis } from "../../../services/modelApi/genericResultsAnalysisClient.js";
import { buildIssueHistoryDocument } from "../history/index.js";
import { assertUserCanAccessIssue, getIssueByIdOrThrow } from "../shared/queries.js";
import { buildAnalysisContext } from "./buildAnalysisContext.js";

export const getFinishedIssueGlobalAnalysis = async ({ issueId, userId, requestAnalysis = requestGenericIssueAnalysis }) => {
  const issue = await getIssueByIdOrThrow(issueId, { select: "ownerId active currentStage", lean: true });
  await assertUserCanAccessIssue({ issue, userId, message: "You are not allowed to access this finished issue" });
  if (issue.active !== false || issue.currentStage !== "finished") throw createBadRequestError("Generic analysis is only available for finished issues", { field: "issueId" });
  const history = await buildIssueHistoryDocument({ issueId });
  return requestAnalysis({ analysisContext: buildAnalysisContext(history) });
};
