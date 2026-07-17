import {
  getIssueEvaluation,
  saveIssueEvaluationDraft,
  submitIssueEvaluation,
} from "../../../services/issue.service";

export const normalizeIssueEvaluationResponse = (response) => {
  const data = response?.data;

  if (!data?.evaluationContext) {
    throw new Error("Missing evaluationContext in evaluation response.");
  }

  return {
    evaluationContext: data.evaluationContext,
    payload: data.payload ?? {},
    collectivePayload:
      data.collectiveReference?.collectiveEvaluations ?? null,
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
