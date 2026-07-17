import { describe, expect, it, vi } from "vitest";

import {
  fetchDecisionModelsServiceHealth,
  reloadDecisionModelsService,
} from "../services/modelApi/decisionModelsServiceSystemClient.js";

const SYSTEM_CLIENT_CASES = [
  {
    call: fetchDecisionModelsServiceHealth,
    method: "GET",
    path: "/health",
    result: {
      service: "DecisionModelsService",
      status: "healthy",
    },
  },
  {
    call: reloadDecisionModelsService,
    method: "POST",
    path: "/system/reload",
    result: {
      service: "DecisionModelsService",
      restartScheduled: true,
    },
  },
];

describe("DecisionModelsService system client", () => {
  it.each(SYSTEM_CLIENT_CASES)(
    "returns the canonical $method $path result and sends the exact request",
    async ({ call, method, path, result }) => {
      const httpClient = {
        request: vi.fn().mockResolvedValue({
          status: 200,
          data: {
            success: true,
            message: "Request completed",
            data: result,
          },
        }),
      };

      await expect(
        call({
          httpClient,
          baseUrl: "  https://models.example.test///  ",
        })
      ).resolves.toBe(result);

      expect(httpClient.request).toHaveBeenCalledTimes(1);
      expect(httpClient.request).toHaveBeenCalledWith({
        method,
        url: `https://models.example.test${path}`,
        validateStatus: expect.any(Function),
      });
      const [{ validateStatus }] = httpClient.request.mock.calls[0];
      expect(validateStatus(200)).toBe(true);
      expect(validateStatus(503)).toBe(true);
    }
  );

  it.each([
    {
      call: fetchDecisionModelsServiceHealth,
      responseData: {
        success: true,
        message: "Healthy",
      },
      message: "DecisionModelsService health response is invalid.",
      code: "DECISION_MODELS_SERVICE_HEALTH_INVALID_RESPONSE",
    },
    {
      call: reloadDecisionModelsService,
      responseData: {
        success: "true",
        message: "Reloading",
        data: null,
      },
      message: "DecisionModelsService reload response is invalid.",
      code: "DECISION_MODELS_SERVICE_RELOAD_INVALID_RESPONSE",
    },
  ])(
    "translates a malformed or partial response into $code",
    async ({ call, responseData, message, code }) => {
      const httpClient = {
        request: vi.fn().mockResolvedValue({
          status: 200,
          data: responseData,
        }),
      };

      await expect(
        call({ httpClient, baseUrl: "https://models.example.test" })
      ).rejects.toMatchObject({
        message,
        statusCode: 502,
        code,
        field: null,
        details: null,
      });
    }
  );

  it("translates a canonical unsuccessful response with its safe error metadata", async () => {
    const details = { retryAfterSeconds: 30 };
    const httpClient = {
      request: vi.fn().mockResolvedValue({
        status: 409,
        data: {
          success: false,
          message: "Reload already scheduled",
          data: null,
          error: {
            code: "RELOAD_ALREADY_SCHEDULED",
            field: "service",
            details,
          },
        },
      }),
    };

    await expect(
      reloadDecisionModelsService({
        httpClient,
        baseUrl: "https://models.example.test",
      })
    ).rejects.toMatchObject({
      message: "Reload already scheduled",
      statusCode: 409,
      code: "RELOAD_ALREADY_SCHEDULED",
      field: "service",
      details,
    });
  });

  it("uses stable fallbacks for a partial unsuccessful response", async () => {
    const httpClient = {
      request: vi.fn().mockResolvedValue({
        status: 200,
        data: {
          success: false,
          message: "Health unavailable",
          data: null,
        },
      }),
    };

    await expect(
      fetchDecisionModelsServiceHealth({
        httpClient,
        baseUrl: "https://models.example.test",
      })
    ).rejects.toMatchObject({
      message: "Health unavailable",
      statusCode: 502,
      code: "DECISION_MODELS_SERVICE_HEALTH_REQUEST_ERROR",
      field: null,
      details: null,
    });
  });

  it("does not expose an arbitrary transport-error payload", async () => {
    const transportError = Object.assign(new Error("socket detail"), {
      response: {
        status: 504,
        data: {
          message: "private upstream stack trace",
          error: {
            code: "PRIVATE_INTERNAL_CODE",
            details: { secret: true },
          },
        },
      },
    });
    const httpClient = {
      request: vi.fn().mockRejectedValue(transportError),
    };

    await expect(
      fetchDecisionModelsServiceHealth({
        httpClient,
        baseUrl: "https://models.example.test",
      })
    ).rejects.toMatchObject({
      message: "Unable to fetch DecisionModelsService health.",
      statusCode: 504,
      code: "DECISION_MODELS_SERVICE_HEALTH_REQUEST_ERROR",
      field: null,
      details: null,
      cause: transportError,
    });
  });

  it("wraps a missing base URL as a request error without making a request", async () => {
    const httpClient = { request: vi.fn() };

    const request = reloadDecisionModelsService({ httpClient, baseUrl: "  " });

    await expect(request).rejects.toMatchObject({
      message: "Unable to schedule DecisionModelsService reload.",
      statusCode: 503,
      code: "DECISION_MODELS_SERVICE_RELOAD_REQUEST_ERROR",
      field: null,
      details: null,
      cause: {
        message: "DECISION_MODELS_SERVICE_BASE_URL is not configured",
        statusCode: 500,
        code: "DECISION_MODELS_SERVICE_CONFIG_ERROR",
        field: "DECISION_MODELS_SERVICE_BASE_URL",
      },
    });
    expect(httpClient.request).not.toHaveBeenCalled();
  });
});
