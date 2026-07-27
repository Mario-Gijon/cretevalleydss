import {
  getIssueEvaluation,
  saveIssueEvaluationDraft,
  submitIssueEvaluation,
} from "../../../services/issue.service";
import { isPlainObject } from "../../../utils/common/objects";

export const normalizeIssueEvaluationResponse = (response) => {
  const data = response?.data;

  if (!data?.decisionContext) {
    throw new Error("Missing decisionContext in evaluation response.");
  }
  if (!isPlainObject(data.payload)) {
    throw new Error("Missing or invalid evaluation payload in evaluation response.");
  }

  return {
    decisionContext: data.decisionContext,
    evaluation: data.payload,
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
