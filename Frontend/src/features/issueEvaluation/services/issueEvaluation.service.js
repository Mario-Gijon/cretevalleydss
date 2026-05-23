import {
  getIssueEvaluation,
  saveIssueEvaluationDraft,
  submitIssueEvaluation,
} from "../../../services/issue.service";

export const fetchIssueEvaluation = (issueOrId, stage) =>
  getIssueEvaluation(issueOrId, stage);

export const saveIssueEvaluation = (issueOrId, stage, payload) =>
  saveIssueEvaluationDraft(issueOrId, stage, payload);

export const submitIssueEvaluationPayload = (issueOrId, stage, payload) =>
  submitIssueEvaluation(issueOrId, stage, payload);
