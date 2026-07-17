import { describe, expect, it, vi } from "vitest";

import {
  applyAdminModelForgeModelPackage,
  deleteAdminModelForgeAsset,
  enrichModelForgeAssetsWithUsage,
  getAdminModelForgeAssets,
  normalizeModelForgeAssetKeyOrThrow,
  normalizeModelForgeAssetKindOrThrow,
  previewAdminModelForgeModelPackage,
} from "../../modules/admin/modelForge/index.js";

describe("admin Model Forge assets", () => {
  it.each([
    "../model",
    "model/key",
    "model\\key",
    ".hidden",
    "model key",
    "model.json",
    "%2e%2e",
    "",
  ])("rejects unsafe or invalid asset key %j", (key) => {
    expect(() => normalizeModelForgeAssetKeyOrThrow(key)).toThrowError(
      expect.objectContaining({
        message: "Valid asset key is required",
        statusCode: 400,
        field: "key",
      })
    );
  });

  it("normalizes only supported kinds and safe keys", () => {
    expect(normalizeModelForgeAssetKindOrThrow(" model ")).toBe("model");
    expect(normalizeModelForgeAssetKeyOrThrow(" example_model-2 ")).toBe(
      "example_model-2"
    );
    expect(() => normalizeModelForgeAssetKindOrThrow("../model")).toThrowError(
      expect.objectContaining({
        message: "Valid asset kind is required",
        field: "kind",
      })
    );
  });

  it("enriches assets with normalized usage and deletion metadata", async () => {
    const countUsage = vi
      .fn()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(Number.NaN);

    await expect(
      enrichModelForgeAssetsWithUsage(
        [
          { kind: " model ", key: " first ", path: "models/first.py" },
          { kind: "model", key: "second" },
        ],
        { countUsage }
      )
    ).resolves.toEqual([
      {
        kind: " model ",
        key: " first ",
        path: "models/first.py",
        usageCount: 3,
        usedByIssuesCount: 3,
        deleteBlockedReason:
          "This asset is used by existing issues and cannot be deleted.",
        deletable: false,
      },
      {
        kind: "model",
        key: "second",
        usageCount: 0,
        usedByIssuesCount: 0,
        deleteBlockedReason: "",
        deletable: true,
      },
    ]);
    expect(countUsage).toHaveBeenNthCalledWith(1, {
      kind: "model",
      key: "first",
    });
  });

  it("blocks deletion when an asset is referenced by issues", async () => {
    const deleteAsset = vi.fn();

    await expect(
      deleteAdminModelForgeAsset(
        { kind: " model ", key: " protected-model " },
        { countUsage: async () => 2, deleteAsset }
      )
    ).rejects.toMatchObject({
      message: "This asset is used by existing issues and cannot be deleted.",
      statusCode: 409,
      code: "MODEL_FORGE_ASSET_IN_USE",
      field: "key",
      details: {
        kind: "model",
        key: "protected-model",
        usageCount: 2,
        usedByIssuesCount: 2,
      },
    });
    expect(deleteAsset).not.toHaveBeenCalled();
  });

  it("deletes an unused normalized asset and preserves the client result", async () => {
    const deleteAsset = vi.fn(async () => ({ deleted: true, path: "asset.py" }));

    await expect(
      deleteAdminModelForgeAsset(
        { kind: " evaluationStructure ", key: " structure-key " },
        { countUsage: async () => 0, deleteAsset }
      )
    ).resolves.toEqual({
      deleted: true,
      path: "asset.py",
      usageCount: 0,
      usedByIssuesCount: 0,
      deletable: true,
    });
    expect(deleteAsset).toHaveBeenCalledWith(
      "evaluationStructure",
      "structure-key"
    );
  });

  it("uses canonical Model Forge client payloads for list, preview, and apply", async () => {
    const assets = {
      root: "/generated",
      models: [{ kind: "model", key: "one" }],
      evaluationStructures: [],
      parameterStructures: [],
    };
    const enrichAssets = vi.fn(async (items) =>
      items.map((item) => ({ ...item, enriched: true }))
    );

    await expect(
      getAdminModelForgeAssets({
        fetchAssets: async () => assets,
        enrichAssets,
      })
    ).resolves.toEqual({
      root: "/generated",
      models: [{ kind: "model", key: "one", enriched: true }],
      evaluationStructures: [],
      parameterStructures: [],
    });

    const previewModelPackage = vi.fn(async (payload) => ({ preview: payload }));
    const applyModelPackage = vi.fn(async (payload) => ({ applied: payload }));
    await expect(
      previewAdminModelForgeModelPackage(
        { key: "one" },
        { previewModelPackage }
      )
    ).resolves.toEqual({ preview: { key: "one" } });
    await expect(
      applyAdminModelForgeModelPackage(
        { key: "one" },
        { applyModelPackage }
      )
    ).resolves.toEqual({ applied: { key: "one" } });
  });
});
