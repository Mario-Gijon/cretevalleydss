import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../src/utils/authFetch.js", async () => {
  const actual = await vi.importActual("../../../../../src/utils/authFetch.js");
  return { ...actual, authFetch: vi.fn() };
});

import { diagnoseCreatorAHPConsistency } from "../../../../../src/services/issue.service.js";
import { diagnoseExpertAHPConsistency } from "../../../../../src/features/issueEvaluation/services/issueEvaluation.service.js";
import { buildCreatorAHPDiagnosticRequest } from "../../../../../src/services/ahpConsistencyDiagnostic.service.js";
import { authFetch } from "../../../../../src/utils/authFetch.js";

const data = { consistencyRatio: 0.04 };

describe("AHP consistency diagnostic services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authFetch.mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        message: "Diagnostic complete",
        data,
      }), { status: 200 }),
    );
  });

  it("sends creator diagnostics with the valid model ID only and preserves the API envelope", async () => {
    const signal = new AbortController().signal;
    const request = {
      criteriaWeightingModelId: "0123456789abcdef01234567",
      criteriaWeightingModelKey: "ahp_criteria_weights",
      criteriaWeightingParameters: { level: "leaf" },
      criteria: [{ id: "draft-a", name: "Quality" }, { id: "draft-b", name: "Cost" }],
      evaluation: { comparisons: [{ criterionId: "draft-a", comparedCriterionId: "draft-b", value: 3 }] },
      signal,
    };

    await expect(diagnoseCreatorAHPConsistency(request)).resolves.toMatchObject({
      success: true,
      message: "Diagnostic complete",
      data,
      error: null,
      status: 200,
    });
    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/issues/criteria-weighting/diagnostics",
      expect.objectContaining({
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteriaWeightingModelId: "0123456789abcdef01234567",
          criteriaWeightingParameters: { level: "leaf" },
          criteria: request.criteria,
          payload: request.evaluation,
        }),
      }),
    );
  });

  it("uses a model key only when there is no valid Mongo ID", () => {
    expect(buildCreatorAHPDiagnosticRequest({
      criteriaWeightingModelId: "invalid-id",
      criteriaWeightingModelKey: "ahp_criteria_weights",
      criteria: [],
      evaluation: { comparisons: [] },
    })).toMatchObject({
      criteriaWeightingModelKey: "ahp_criteria_weights",
    });
    expect(buildCreatorAHPDiagnosticRequest({
      criteriaWeightingModelId: "invalid-id",
      criteriaWeightingModelKey: "",
      criteria: [],
      evaluation: { comparisons: [] },
    })).toBeNull();
  });

  it("sends only the evaluation payload to the expert endpoint and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    const evaluation = { comparisons: [{ criterionId: "c1", comparedCriterionId: "c2", value: 2 }] };

    await diagnoseExpertAHPConsistency({ issueId: "issue/1", evaluation, signal });

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/issues/issue%2F1/evaluations/criteriaWeighting/diagnostics",
      expect.objectContaining({
        method: "POST",
        signal,
        body: JSON.stringify({ payload: evaluation }),
      }),
    );
  });

  it("normalizes service errors and malformed envelopes without swallowing aborts", async () => {
    authFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      success: false,
      message: "Invalid matrix",
      data: null,
      error: { code: "DECISION_MODELS_SERVICE_DIAGNOSTIC_INPUT_INVALID" },
    }), { status: 422 }));
    const rejected = await diagnoseExpertAHPConsistency({ issueId: "issue-1", evaluation: {} });
    expect(rejected).toMatchObject({ success: false, status: 422, error: { code: "DECISION_MODELS_SERVICE_DIAGNOSTIC_INPUT_INVALID" } });

    authFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }));
    await expect(diagnoseExpertAHPConsistency({ issueId: "issue-1", evaluation: {} })).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_RESPONSE" },
    });

    const aborted = new DOMException("Cancelled", "AbortError");
    authFetch.mockRejectedValueOnce(aborted);
    await expect(diagnoseExpertAHPConsistency({ issueId: "issue-1", evaluation: {}, signal: new AbortController().signal }))
      .rejects.toBe(aborted);
  });
});
