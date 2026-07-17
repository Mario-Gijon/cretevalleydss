import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/issue.service", () => ({
  getIssueEvaluation: vi.fn(),
  saveIssueEvaluationDraft: vi.fn(),
  submitIssueEvaluation: vi.fn(),
}));

import {
  getIssueEvaluation,
  saveIssueEvaluationDraft,
  submitIssueEvaluation,
} from "../../../src/services/issue.service";
import {
  fetchIssueEvaluation,
  normalizeIssueEvaluationResponse,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../../../src/features/issueEvaluation/services/issueEvaluation.service.js";

describe("issueEvaluation.service", () => {
  it("fetchIssueEvaluation delegates and returns one canonical load contract", async () => {
    const evaluationContext = { issue: { id: "issue-1" } };
    getIssueEvaluation.mockResolvedValue({
      success: true,
      data: {
        evaluationContext,
        payload: { matrix: { a: 1 } },
        collectiveReference: { collectiveEvaluations: { shared: true } },
      },
    });

    const issue = { _id: "issue-1" };
    const response = await fetchIssueEvaluation(issue, "alternativeEvaluation");

    expect(response).toEqual({
      evaluationContext,
      payload: { matrix: { a: 1 } },
      collectivePayload: { shared: true },
    });
    expect(getIssueEvaluation).toHaveBeenCalledWith(issue, "alternativeEvaluation");
  });

  it("normalizes optional evaluation data without accepting a missing context", () => {
    const evaluationContext = { issue: { id: "issue-2" } };

    expect(
      normalizeIssueEvaluationResponse({ data: { evaluationContext } })
    ).toEqual({
      evaluationContext,
      payload: {},
      collectivePayload: null,
    });
    expect(() =>
      normalizeIssueEvaluationResponse({ data: { payload: { stale: true } } })
    ).toThrow("Missing evaluationContext in evaluation response.");
  });

  it("saveIssueEvaluation delegates to saveIssueEvaluationDraft and passes payload unchanged", async () => {
    saveIssueEvaluationDraft.mockResolvedValue({ success: true });

    const payload = { matrix: { a: 1 } };
    await saveIssueEvaluation("issue-2", "criteriaWeighting", payload);

    expect(saveIssueEvaluationDraft).toHaveBeenCalledWith(
      "issue-2",
      "criteriaWeighting",
      payload
    );
  });

  it("submitIssueEvaluationPayload delegates to submitIssueEvaluation and accepts issue objects", async () => {
    submitIssueEvaluation.mockResolvedValue({ success: true });

    const issue = { id: "issue-3" };
    const payload = { bestCriterion: "c1" };
    await submitIssueEvaluationPayload(issue, "criteriaWeighting", payload);

    expect(submitIssueEvaluation).toHaveBeenCalledWith(
      issue,
      "criteriaWeighting",
      payload
    );
  });
});
