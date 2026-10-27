import { describe, expect, it, vi } from "vitest";

import {
  requestDecisionModelsServiceDiagnostic,
} from "../../services/modelApi/decisionModelsServiceDiagnosticsClient.js";
import {
  assertAHPDiagnosticResultOrThrow,
} from "../../modules/issues/criteriaWeightingDiagnostics/ahpDiagnosticContract.js";

const diagnostic = (overrides = {}) => ({
  expertKey: "authenticated-user-id",
  expertName: "Expert",
  criterionCount: 3,
  completedComparisons: 3,
  requiredComparisons: 3,
  lambdaMax: 3.1,
  consistencyIndex: 0.05,
  randomIndex: 0.58,
  consistencyRatio: 0.08620689655172414,
  consistencyStatus: "consistent",
  consistencyThreshold: 0.1,
  triads: [],
  candidateComparisons: [],
  recommendations: [],
  criteria: [
    { id: "draft-q", name: "Quality" },
    { id: "draft-c", name: "Cost" },
    { id: "draft-s", name: "Safety" },
  ],
  ...overrides,
});

const successResponse = (data = diagnostic()) => ({
  status: 200,
  data: {
    success: true,
    message: "AHP diagnostic completed",
    data,
    error: null,
  },
});

describe("DecisionModelsService diagnostics client", () => {
  it("calls only the fixed diagnostics route and preserves the DMS result values", async () => {
    const result = diagnostic();
    const httpClient = {
      post: vi.fn().mockResolvedValue(successResponse(result)),
    };
    const requestPayload = {
      modelParameters: {},
      evaluations: [{ expert: { id: "authenticated-user-id" }, payload: {} }],
      context: { structure: { key: "criteriaPairwiseAHP" } },
    };

    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "ahp_criteria_weights",
        requestPayload,
        decisionModelsServiceBaseUrl: "http://dms.internal:7000/",
        timeoutMs: 1800,
        httpClient,
      })
    ).resolves.toBe(result);

    expect(httpClient.post).toHaveBeenCalledWith(
      "http://dms.internal:7000/diagnostics/ahp_criteria_weights",
      requestPayload,
      { timeout: 1800, validateStatus: expect.any(Function) }
    );
    expect(httpClient.post.mock.calls[0][2].validateStatus(422)).toBe(true);
  });

  it("preserves the non-applicable CR response for one or two criteria", async () => {
    const result = diagnostic({
      criterionCount: 2,
      completedComparisons: 1,
      requiredComparisons: 1,
      consistencyIndex: null,
      randomIndex: 0,
      consistencyRatio: null,
      consistencyStatus: "not_applicable",
      criteria: [
        { id: "draft-a", name: "A" },
        { id: "draft-b", name: "B" },
      ],
    });
    const httpClient = { post: vi.fn().mockResolvedValue(successResponse(result)) };

    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "ahp_criteria_weights",
        requestPayload: {},
        httpClient,
      })
    ).resolves.toBe(result);
  });

  it("returns high CR as a diagnostic warning without turning it into a request failure", async () => {
    const result = diagnostic({
      consistencyRatio: 0.4123456789012345,
      consistencyStatus: "review",
    });
    const httpClient = { post: vi.fn().mockResolvedValue(successResponse(result)) };

    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "ahp_criteria_weights",
        requestPayload: {},
        httpClient,
      })
    ).resolves.toBe(result);
  });

  it.each([
    [404, "DIAGNOSTIC_NOT_SUPPORTED", 501, "DECISION_MODELS_SERVICE_DIAGNOSTIC_NOT_SUPPORTED"],
    [422, "DIAGNOSTIC_INPUT_INVALID", 422, "DECISION_MODELS_SERVICE_DIAGNOSTIC_INPUT_INVALID"],
    [500, "DIAGNOSTIC_EXECUTION_ERROR", 502, "DECISION_MODELS_SERVICE_DIAGNOSTIC_ERROR"],
  ])("maps DMS %s %s to a stable Backend error", async (status, upstreamCode, statusCode, code) => {
    const httpClient = {
      post: vi.fn().mockResolvedValue({
        status,
        data: {
          success: false,
          message: "Upstream diagnostic failure",
          data: null,
          error: { code: upstreamCode, field: "request", details: { private: true } },
        },
      }),
    };

    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "ahp_criteria_weights",
        requestPayload: {},
        httpClient,
      })
    ).rejects.toMatchObject({ statusCode, code });
  });

  it("distinguishes timeout and connection failure without exposing request details", async () => {
    const timeout = Object.assign(new Error("slow request containing matrix data"), {
      code: "ECONNABORTED",
    });
    const timeoutClient = { post: vi.fn().mockRejectedValue(timeout) };
    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "ahp_criteria_weights",
        requestPayload: {},
        httpClient: timeoutClient,
      })
    ).rejects.toMatchObject({
      statusCode: 504,
      code: "DECISION_MODELS_SERVICE_DIAGNOSTIC_TIMEOUT",
    });

    const connectionClient = {
      post: vi.fn().mockRejectedValue(new Error("connection refused")),
    };
    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "ahp_criteria_weights",
        requestPayload: {},
        httpClient: connectionClient,
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "DECISION_MODELS_SERVICE_UNAVAILABLE",
    });
  });

  it("rejects malformed envelopes, timeout settings, and missing configuration", async () => {
    const malformedClient = {
      post: vi.fn().mockResolvedValue({
        status: 200,
        data: { success: true, message: "missing data" },
      }),
    };
    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "ahp_criteria_weights",
        requestPayload: {},
        httpClient: malformedClient,
      })
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "DECISION_MODELS_SERVICE_INVALID_RESPONSE",
    });

    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "ahp_criteria_weights",
        requestPayload: {},
        decisionModelsServiceBaseUrl: " ",
        httpClient: malformedClient,
      })
    ).rejects.toMatchObject({ code: "DECISION_MODELS_SERVICE_CONFIG_ERROR" });

    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "ahp_criteria_weights",
        requestPayload: {},
        timeoutMs: 50,
        httpClient: malformedClient,
      })
    ).rejects.toMatchObject({ code: "DECISION_MODELS_SERVICE_CONFIG_ERROR" });
  });

  it("keeps generic transport independent of model-specific result schemas", async () => {
    const opaqueResult = { arbitraryFutureDiagnostic: [1, 2, 3] };
    const httpClient = {
      post: vi.fn().mockResolvedValue(successResponse(opaqueResult)),
    };

    await expect(
      requestDecisionModelsServiceDiagnostic({
        apiModelKey: "future_diagnostic_model",
        requestPayload: {},
        httpClient,
      })
    ).resolves.toBe(opaqueResult);
  });

  it("validates the AHP result contract separately from the reusable transport", () => {
    const result = diagnostic();
    expect(assertAHPDiagnosticResultOrThrow(result)).toBe(result);
    expect(
      assertAHPDiagnosticResultOrThrow({
        ...result,
        consistencyRatio: null,
        consistencyIndex: null,
        consistencyStatus: "not_applicable",
      })
    ).toMatchObject({ consistencyRatio: null, consistencyStatus: "not_applicable" });
    expect(() =>
      assertAHPDiagnosticResultOrThrow({ consistencyRatio: 0.2 })
    ).toThrowError(
      expect.objectContaining({
        statusCode: 502,
        code: "DECISION_MODELS_SERVICE_INVALID_RESPONSE",
      })
    );
  });
});
