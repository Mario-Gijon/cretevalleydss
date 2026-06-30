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
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../../../src/features/issueEvaluation/services/issueEvaluation.service.js";

describe("issueEvaluation.service", () => {
  it("fetchIssueEvaluation delegates to getIssueEvaluation", async () => {
    getIssueEvaluation.mockResolvedValue({ success: true });

    const issue = { _id: "issue-1" };
    const response = await fetchIssueEvaluation(issue, "alternativeEvaluation");

    expect(response).toEqual({ success: true });
    expect(getIssueEvaluation).toHaveBeenCalledWith(issue, "alternativeEvaluation");
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
