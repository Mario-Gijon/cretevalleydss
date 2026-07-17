import { afterEach, describe, expect, it, vi } from "vitest";

import { executeDecisionModelRequest } from "../../../modules/issues/modelExecution/executeApiModelRequest.js";

const originalBaseUrl = process.env.DECISION_MODELS_SERVICE_BASE_URL;

describe("decision-model execution transport", () => {
  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.DECISION_MODELS_SERVICE_BASE_URL;
    } else {
      process.env.DECISION_MODELS_SERVICE_BASE_URL = originalBaseUrl;
    }
  });

  it("resolves the configured base URL for each request", async () => {
    const httpClient = {
      post: vi.fn(async () => ({
        status: 200,
        data: {
          success: true,
          message: "Computed",
          data: { ranking: ["A", "B"] },
        },
      })),
    };

    process.env.DECISION_MODELS_SERVICE_BASE_URL = "http://first.example.test";
    await executeDecisionModelRequest({
      apiEndpointPath: "/models/rank",
      requestPayload: { phase: 1 },
      httpClient,
    });

    process.env.DECISION_MODELS_SERVICE_BASE_URL = "http://second.example.test";
    await executeDecisionModelRequest({
      apiEndpointPath: "/models/rank",
      requestPayload: { phase: 2 },
      httpClient,
    });

    expect(httpClient.post).toHaveBeenNthCalledWith(
      1,
      "http://first.example.test/models/rank",
      { phase: 1 }
    );
    expect(httpClient.post).toHaveBeenNthCalledWith(
      2,
      "http://second.example.test/models/rank",
      { phase: 2 }
    );
  });
});
