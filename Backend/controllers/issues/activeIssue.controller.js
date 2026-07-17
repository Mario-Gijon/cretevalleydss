import { getActiveIssuesPayload } from "../../modules/issues/active/index.js";
import {
  deleteActiveIssueWorkflow,
  leaveActiveIssueWorkflow,
} from "../../modules/issues/lifecycle/index.js";
import { editIssueExpertsWorkflow } from "../../modules/issues/participants/index.js";
import { sendSuccess } from "../../utils/common/responses.js";

export const getAllActiveIssues = async (req, res) => {
  const payload = await getActiveIssuesPayload({
    userId: req.uid,
  });

  return sendSuccess(res, "Active issues fetched successfully", payload);
};

export const removeIssue = async (req, res) => {
  return deleteActiveIssueWorkflow({
    issueId: req.params.id,
    userId: req.uid,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, `Issue ${result.issueName} removed`, {
        issueName: result.issueName,
      }),
  });
};

export const editExperts = async (req, res) => {
  const hasExpertWeightsByEmail = Object.prototype.hasOwnProperty.call(
    req.body,
    "expertWeightsByEmail"
  );

  return editIssueExpertsWorkflow({
    issueId: req.params.id,
    userId: req.uid,
    expertsToAdd: req.body.expertsToAdd,
    expertsToRemove: req.body.expertsToRemove,
    expertWeightsByEmail: req.body.expertWeightsByEmail ?? null,
    hasExpertWeightsByEmail,
    beforeSessionCleanup: () =>
      sendSuccess(res, "Experts updated successfully."),
  });
};

export const leaveIssue = async (req, res) => {
  return leaveActiveIssueWorkflow({
    issueId: req.params.id,
    userId: req.uid,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, "You have left the issue successfully", {
        issueName: result.issueName,
      }),
  });
};
