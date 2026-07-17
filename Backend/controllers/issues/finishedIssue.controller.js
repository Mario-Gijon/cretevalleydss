import {
  getFinishedIssueInfoPayload,
  getFinishedIssuesPayload,
} from "../../modules/issues/finished/index.js";
import { hideFinishedIssueWorkflow } from "../../modules/issues/lifecycle/index.js";
import { sendSuccess } from "../../utils/common/responses.js";

export const getAllFinishedIssues = async (req, res) => {
  const issues = await getFinishedIssuesPayload({ userId: req.uid });

  return sendSuccess(res, "Finished issues fetched successfully", issues);
};

export const getFinishedIssueInfo = async (req, res) => {
  const issueInfo = await getFinishedIssueInfoPayload({
    issueId: req.params.id,
    userId: req.uid,
  });

  return sendSuccess(res, "Issue info sent", issueInfo);
};

export const removeFinishedIssue = async (req, res) => {
  return hideFinishedIssueWorkflow({
    issueId: req.params.id,
    userId: req.uid,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, `Issue ${result.issueName} removed`, {
        issueName: result.issueName,
      }),
  });
};
