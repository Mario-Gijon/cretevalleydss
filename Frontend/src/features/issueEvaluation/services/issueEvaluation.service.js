import {
  getIssueEvaluation,
  saveIssueEvaluationDraft,
  submitIssueEvaluation,
} from "../../../services/issue.service";

export const normalizeIssueEvaluationResponse = (response) => {
  const data = response?.data;

  if (!data?.decisionContext) {
    throw new Error("Missing decisionContext in evaluation response.");
  }

  return {
    decisionContext: data.decisionContext,
    evaluation: data.payload ?? {},
    collectiveEvaluation: data.collectivePayload ?? null,
  };
};

export const fetchIssueEvaluation = async (issueOrId, stage) =>
  normalizeIssueEvaluationResponse(
    await getIssueEvaluation(issueOrId, stage)
  );

export const saveIssueEvaluation = (issueOrId, stage, payload) =>
  saveIssueEvaluationDraft(issueOrId, stage, payload);

export const submitIssueEvaluationPayload = (issueOrId, stage, payload) =>
  submitIssueEvaluation(issueOrId, stage, payload);
