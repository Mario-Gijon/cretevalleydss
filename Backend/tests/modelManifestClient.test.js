import { describe, expect, it, vi } from "vitest";

import {
  fetchModelManifest,
  getManifestModels,
  getPublicIssueManifestModels,
} from "../services/modelApi/modelManifestClient.js";

const createClientWithResponse = (response) => ({
  get: vi.fn().mockResolvedValue(response),
});

describe("model manifest client", () => {
  it("returns the canonical manifest data and requests the exact normalized URL", async () => {
    const manifest = {
      models: [
        {
          key: "ahp",
          modelKind: "issue",
          publicUsable: true,
        },
      ],
      generatedAt: "2026-07-17T10:00:00.000Z",
      version: "v2",
    };
    const httpClient = createClientWithResponse({
      status: 200,
      data: {
        success: true,
        message: "Manifest retrieved",
        data: manifest,
      },
    });

    await expect(
      fetchModelManifest({
        httpClient,
        decisionModelsServiceBaseUrl:
          "  https://models.example.test/api///  ",
      })
    ).resolves.toBe(manifest);

    expect(httpClient.get).toHaveBeenCalledTimes(1);
    expect(httpClient.get).toHaveBeenCalledWith(
      "https://models.example.test/api/models/manifest"
    );
  });

  it.each([
    {
      responseData: undefined,
      message:
        "Model manifest response does not use the expected success payload shape",
      details: { requiredKeys: ["success", "message", "data"] },
    },
    {
      responseData: { success: true, message: "Manifest retrieved" },
      message:
        "Model manifest response does not use the expected success payload shape",
      details: { requiredKeys: ["success", "message", "data"] },
    },
    {
      responseData: {
        success: true,
        message: "Manifest retrieved",
        data: null,
      },
      message: "Model manifest response data is invalid",
      details: null,
    },
    {
      responseData: {
        success: true,
        message: "Manifest retrieved",
        data: { models: {} },
      },
      message: "Model manifest models must be an array",
      details: null,
    },
  ])(
    "translates malformed or partial manifest payloads: $message",
    async ({ responseData, message, details }) => {
      const httpClient = createClientWithResponse({
        status: 200,
        data: responseData,
      });

      await expect(
        fetchModelManifest({
          httpClient,
          decisionModelsServiceBaseUrl: "https://models.example.test",
        })
      ).rejects.toMatchObject({
        message,
        statusCode: 502,
        code: "MODEL_MANIFEST_INVALID_RESPONSE",
        field: null,
        details,
      });
    }
  );

  it("translates a canonical unsuccessful response with its safe error metadata", async () => {
    const details = { manifestVersion: "unsupported" };
    const httpClient = createClientWithResponse({
      status: 422,
      data: {
        success: false,
        message: "Manifest cannot be generated",
        data: null,
        error: {
          code: "MANIFEST_GENERATION_FAILED",
          field: "model",
          details,
        },
      },
    });

    await expect(
      fetchModelManifest({
        httpClient,
        decisionModelsServiceBaseUrl: "https://models.example.test",
      })
    ).rejects.toMatchObject({
      message: "Manifest cannot be generated",
      statusCode: 422,
      code: "MANIFEST_GENERATION_FAILED",
      field: "model",
      details,
    });
  });

  it("uses stable fallbacks for a partial unsuccessful response", async () => {
    const httpClient = createClientWithResponse({
      status: 200,
      data: {
        success: false,
        message: "Manifest unavailable",
        data: null,
      },
    });

    await expect(
      fetchModelManifest({
        httpClient,
        decisionModelsServiceBaseUrl: "https://models.example.test",
      })
    ).rejects.toMatchObject({
      message: "Manifest unavailable",
      statusCode: 502,
      code: "MODEL_MANIFEST_UPSTREAM_ERROR",
      field: null,
      details: null,
    });
  });

  it("translates a rejected canonical upstream response", async () => {
    const upstreamError = Object.assign(new Error("request rejected"), {
      response: {
        status: 503,
        data: {
          success: false,
          message: "Manifest service is warming up",
          data: null,
          error: {
            code: "SERVICE_WARMING_UP",
            field: "service",
            details: { retryAfterSeconds: 5 },
          },
        },
      },
    });
    const httpClient = { get: vi.fn().mockRejectedValue(upstreamError) };

    await expect(
      fetchModelManifest({
        httpClient,
        decisionModelsServiceBaseUrl: "https://models.example.test",
      })
    ).rejects.toMatchObject({
      message: "Manifest service is warming up",
      statusCode: 503,
      code: "SERVICE_WARMING_UP",
      field: "service",
      details: { retryAfterSeconds: 5 },
      cause: upstreamError,
    });
  });

  it.each([
    {
      status: 400,
      code: "MODEL_MANIFEST_REQUEST_ERROR",
    },
    {
      status: 503,
      code: "MODEL_MANIFEST_UPSTREAM_ERROR",
    },
  ])(
    "does not expose an arbitrary rejected payload at HTTP $status",
    async ({ status, code }) => {
      const upstreamError = Object.assign(new Error("transport detail"), {
        response: {
          status,
          data: {
            message: "private upstream stack trace",
            error: {
              code: "PRIVATE_INTERNAL_CODE",
              details: { secret: true },
            },
          },
        },
      });
      const httpClient = { get: vi.fn().mockRejectedValue(upstreamError) };

      await expect(
        fetchModelManifest({
          httpClient,
          decisionModelsServiceBaseUrl: "https://models.example.test",
        })
      ).rejects.toMatchObject({
        message:
          "Unable to fetch model manifest from DecisionModelsService",
        statusCode: status,
        code,
        field: null,
        details: null,
        cause: upstreamError,
      });
    }
  );

  it("returns model arrays and filters the public issue catalog exactly", async () => {
    const models = [
      { key: "public-issue", modelKind: "issue", publicUsable: true },
      { key: "private-issue", modelKind: "issue", publicUsable: false },
      {
        key: "criteria-weighting",
        modelKind: "criteriaWeighting",
        publicUsable: true,
      },
      null,
    ];
    const createHttpClient = () =>
      createClientWithResponse({
        status: 200,
        data: {
          success: true,
          message: "Manifest retrieved",
          data: { models },
        },
      });
    const baseOptions = {
      decisionModelsServiceBaseUrl: "https://models.example.test",
    };

    await expect(
      getManifestModels({ ...baseOptions, httpClient: createHttpClient() })
    ).resolves.toBe(models);
    await expect(
      getPublicIssueManifestModels({
        ...baseOptions,
        httpClient: createHttpClient(),
      })
    ).resolves.toEqual([models[0]]);
  });

  it("rejects a missing base URL before making a request", async () => {
    const httpClient = { get: vi.fn() };

    await expect(
      fetchModelManifest({
        httpClient,
        decisionModelsServiceBaseUrl: "  ",
      })
    ).rejects.toMatchObject({
      message: "DECISION_MODELS_SERVICE_BASE_URL is not configured",
      statusCode: 500,
      code: "MODEL_MANIFEST_CONFIG_ERROR",
      field: "DECISION_MODELS_SERVICE_BASE_URL",
      details: null,
    });
    expect(httpClient.get).not.toHaveBeenCalled();
  });
});
