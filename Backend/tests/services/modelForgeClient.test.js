import { describe, expect, it, vi } from "vitest";

import {
  applyModelForgeModelPackage,
  deleteModelForgeAsset,
  fetchModelForgeAssets,
  fetchModelForgeCatalog,
  previewModelForgeModelPackage,
} from "../../services/modelForge/modelForgeClient.js";

const MODEL_FORGE_BASE_URL = "https://model-forge.example.test/api";

describe("Model Forge HTTP client adapter", () => {
  it("returns the canonical scaffold catalog and normalizes the request URL", async () => {
    const catalog = {
      parameterStructures: [{ key: "numeric" }],
      evaluationStructures: [{ key: "alternatives" }],
      metadata: { version: "1.0" },
    };
    const httpClient = {
      get: vi.fn(async () => ({ data: catalog })),
    };

    await expect(
      fetchModelForgeCatalog({
        httpClient,
        modelForgeBaseUrl: `  ${MODEL_FORGE_BASE_URL}/  `,
      })
    ).resolves.toBe(catalog);
    expect(httpClient.get).toHaveBeenCalledWith(
      `${MODEL_FORGE_BASE_URL}/scaffold/catalog`
    );
  });

  it("returns the canonical generated-assets payload", async () => {
    const assets = {
      models: [{ kind: "model", key: "model-one" }],
      evaluationStructures: [
        { kind: "evaluationStructure", key: "evaluation-one" },
      ],
      parameterStructures: [
        { kind: "parameterStructure", key: "parameter-one" },
      ],
      generatedRoot: "/srv/generated",
    };
    const httpClient = {
      get: vi.fn(async () => ({ data: assets })),
    };

    await expect(
      fetchModelForgeAssets({ httpClient, modelForgeBaseUrl: MODEL_FORGE_BASE_URL })
    ).resolves.toBe(assets);
    expect(httpClient.get).toHaveBeenCalledWith(
      `${MODEL_FORGE_BASE_URL}/scaffold/assets`
    );
  });

  it.each([
    {
      label: "non-object catalog",
      load: fetchModelForgeCatalog,
      payload: null,
      expectedMessage: "ModelForge scaffold catalog response is invalid",
      expectedField: null,
    },
    {
      label: "partial catalog",
      load: fetchModelForgeCatalog,
      payload: { parameterStructures: [] },
      expectedMessage:
        "ModelForge scaffold catalog evaluationStructures is invalid",
      expectedField: "evaluationStructures",
    },
    {
      label: "partial asset listing",
      load: fetchModelForgeAssets,
      payload: { models: [], evaluationStructures: [] },
      expectedMessage:
        "ModelForge scaffold assets parameterStructures is invalid",
      expectedField: "parameterStructures",
    },
  ])(
    "translates a $label response into the stable invalid-response error",
    async ({ load, payload, expectedMessage, expectedField }) => {
      const httpClient = {
        get: vi.fn(async () => ({ data: payload })),
      };

      await expect(
        load({ httpClient, modelForgeBaseUrl: MODEL_FORGE_BASE_URL })
      ).rejects.toMatchObject({
        message: expectedMessage,
        statusCode: 502,
        code: "MODEL_FORGE_INVALID_RESPONSE",
        field: expectedField,
      });
    }
  );

  it("preserves safe standard upstream metadata with the current generic code", async () => {
    const upstreamError = new Error("request rejected");
    upstreamError.response = {
      status: 422,
      data: {
        success: false,
        message: "Generated model key is invalid",
        data: null,
        error: {
          code: "INVALID_MODEL_KEY",
          field: "model.key",
          details: { allowedPattern: "^[a-z-]+$" },
        },
      },
    };
    const httpClient = {
      request: vi.fn(async () => {
        throw upstreamError;
      }),
    };

    await expect(
      previewModelForgeModelPackage(
        { model: { key: "Not Valid" } },
        { httpClient, modelForgeBaseUrl: MODEL_FORGE_BASE_URL }
      )
    ).rejects.toMatchObject({
      message: "Generated model key is invalid",
      statusCode: 422,
      code: "MODEL_FORGE_UPSTREAM_ERROR",
      field: "model.key",
      details: { allowedPattern: "^[a-z-]+$" },
      cause: upstreamError,
    });
  });

  it("normalizes a FastAPI detail response without exposing transport text", async () => {
    const upstreamError = new Error("connect ECONNRESET secret-host:9000");
    upstreamError.response = {
      status: 400,
      data: { detail: { message: "Package could not be generated", step: 2 } },
    };
    const httpClient = {
      request: vi.fn(async () => {
        throw upstreamError;
      }),
    };

    await expect(
      applyModelForgeModelPackage(
        { model: { key: "one" } },
        { httpClient, modelForgeBaseUrl: MODEL_FORGE_BASE_URL }
      )
    ).rejects.toMatchObject({
      message: "Package could not be generated",
      statusCode: 400,
      code: "MODEL_FORGE_REQUEST_ERROR",
      field: null,
      details: { message: "Package could not be generated", step: 2 },
      cause: upstreamError,
    });
  });

  it("uses a stable fallback for transport failures without a response", async () => {
    const transportError = new Error("connect ECONNREFUSED internal-host:9000");
    const httpClient = {
      get: vi.fn(async () => {
        throw transportError;
      }),
    };

    await expect(
      fetchModelForgeAssets({ httpClient, modelForgeBaseUrl: MODEL_FORGE_BASE_URL })
    ).rejects.toMatchObject({
      message: "Unable to fetch scaffold assets from ModelForge",
      statusCode: 503,
      code: "MODEL_FORGE_UPSTREAM_ERROR",
      field: null,
      details: null,
      cause: transportError,
    });
  });

  it.each([
    [
      previewModelForgeModelPackage,
      "/scaffold/model-package/preview",
      { operation: "preview" },
    ],
    [
      applyModelForgeModelPackage,
      "/scaffold/model-package/apply",
      { operation: "apply" },
    ],
  ])("posts package requests and returns the client result unchanged", async (
    requestPackage,
    requestPath,
    result
  ) => {
    const payload = { model: { key: "model-one" } };
    const httpClient = {
      request: vi.fn(async () => ({ data: result })),
    };

    await expect(
      requestPackage(payload, {
        httpClient,
        modelForgeBaseUrl: `${MODEL_FORGE_BASE_URL}/`,
      })
    ).resolves.toBe(result);
    expect(httpClient.request).toHaveBeenCalledWith({
      method: "POST",
      url: `${MODEL_FORGE_BASE_URL}${requestPath}`,
      data: payload,
    });
  });

  it("percent-encodes delete path segments and never sends them as a body", async () => {
    const result = { deleted: true };
    const httpClient = {
      request: vi.fn(async () => ({ data: result })),
    };

    await expect(
      deleteModelForgeAsset("model/type", "name ../?#% ü", {
        httpClient,
        modelForgeBaseUrl: `${MODEL_FORGE_BASE_URL}/`,
      })
    ).resolves.toBe(result);
    expect(httpClient.request).toHaveBeenCalledWith({
      method: "DELETE",
      url:
        `${MODEL_FORGE_BASE_URL}/scaffold/assets/` +
        "model%2Ftype/name%20..%2F%3F%23%25%20%C3%BC",
      data: undefined,
    });
  });

  it("rejects a missing base URL before invoking the HTTP client", async () => {
    const httpClient = { get: vi.fn() };

    await expect(
      fetchModelForgeCatalog({ httpClient, modelForgeBaseUrl: "  " })
    ).rejects.toMatchObject({
      message: "MODEL_FORGE_BASE_URL is not configured",
      statusCode: 500,
      code: "MODEL_FORGE_CONFIG_ERROR",
      field: "MODEL_FORGE_BASE_URL",
    });
    expect(httpClient.get).not.toHaveBeenCalled();
  });
});
