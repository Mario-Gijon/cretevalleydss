import { describe, expect, it, vi } from "vitest";

import {
  getAdminModelCatalog,
  mapIssueModelCatalogItem,
  sortModelCatalogItems,
  updateAdminModelCatalogVisibility,
} from "../../modules/admin/modelCatalog/index.js";

describe("admin model catalog", () => {
  it("serializes model visibility and protected historical state", () => {
    const mapped = mapIssueModelCatalogItem({
      _id: "000000000000000000000001",
      name: "Historical weighting",
      apiModelKey: "historical-weighting",
      modelKind: "criteriaWeighting",
      visibleInIssueCreation: true,
      visibleInCriteriaWeighting: true,
      manifestSync: { isStale: true },
      usesCriteriaWeights: 1,
      usesExpertWeights: true,
    });

    expect(mapped).toMatchObject({
      _id: "000000000000000000000001",
      id: "000000000000000000000001",
      implementationStatus: "ready",
      publicUsable: false,
      protectedHistoricalModel: true,
      visibleInIssueCreation: true,
      visibleInCriteriaWeighting: true,
      usesCriteriaWeights: false,
      usesExpertWeights: true,
    });
  });

  it("sorts by public visibility rank and then name", () => {
    const models = [
      { name: "Zulu hidden", visibleInIssueCreation: false, visibleInCriteriaWeighting: false },
      { name: "Beta current", visibleInIssueCreation: true, manifestSync: { isStale: false } },
      { name: "Alpha current", visibleInIssueCreation: true, manifestSync: { isStale: false } },
      { name: "Historical", visibleInIssueCreation: true, manifestSync: { isStale: true } },
      { name: "Weighting", visibleInIssueCreation: false, visibleInCriteriaWeighting: true },
    ];

    expect(sortModelCatalogItems(models).map((model) => model.name)).toEqual([
      "Alpha current",
      "Beta current",
      "Historical",
      "Weighting",
      "Zulu hidden",
    ]);
    expect(models[0].name).toBe("Zulu hidden");
  });

  it("loads, maps, and sorts the catalog through its public query API", async () => {
    const lean = vi.fn(async () => [
      {
        _id: "000000000000000000000002",
        name: "Hidden",
        modelKind: "issue",
        visibleInIssueCreation: false,
        visibleInCriteriaWeighting: false,
      },
      {
        _id: "000000000000000000000001",
        name: "Available",
        modelKind: "issue",
      },
    ]);
    const select = vi.fn(() => ({ lean }));
    const issueModelModel = { find: vi.fn(() => ({ select })) };

    await expect(getAdminModelCatalog({ issueModelModel })).resolves.toMatchObject({
      models: [
        { name: "Available", publicUsable: true },
        { name: "Hidden", publicUsable: false },
      ],
    });
    expect(select).toHaveBeenCalledWith("-__v");
  });

  it("rejects visibility flags that do not apply to a model kind", async () => {
    const issueModelModel = {
      findById: vi.fn(async () => ({
        modelKind: "issue",
        manifestSync: { isStale: false },
      })),
    };

    await expect(
      updateAdminModelCatalogVisibility(
        {
          modelId: "model-id",
          visibleInCriteriaWeighting: true,
        },
        { issueModelModel, isValidModelId: () => true }
      )
    ).rejects.toMatchObject({
      message: "This visibility flag is not applicable to the selected model kind.",
      statusCode: 400,
      code: "MODEL_VISIBILITY_NOT_APPLICABLE",
      field: "visibleInCriteriaWeighting",
    });
  });

  it("prevents stale models from being made visible again", async () => {
    const issueModelModel = {
      findById: vi.fn(async () => ({
        modelKind: "criteriaWeighting",
        manifestSync: { isStale: true },
      })),
    };

    await expect(
      updateAdminModelCatalogVisibility(
        {
          modelId: "model-id",
          visibleInCriteriaWeighting: true,
        },
        { issueModelModel, isValidModelId: () => true }
      )
    ).rejects.toMatchObject({
      message:
        "This model is no longer present in the DecisionModelsService manifest and is kept only because existing issues reference it.",
      statusCode: 400,
      code: "PROTECTED_HISTORICAL_MODEL_NOT_ACTIVABLE",
      field: "visibleInCriteriaWeighting",
    });
  });

  it("persists only supplied visibility values and returns the canonical payload", async () => {
    const currentModel = {
      _id: "000000000000000000000001",
      modelKind: "issue",
      manifestSync: { isStale: false },
      set: vi.fn(),
      save: vi.fn(async () => {}),
    };
    const persistedModel = {
      _id: currentModel._id,
      name: "Updated",
      modelKind: "issue",
      visibleInIssueCreation: false,
      visibleInCriteriaWeighting: false,
      manifestSync: { isStale: false },
    };
    const lean = vi.fn(async () => persistedModel);
    const select = vi.fn(() => ({ lean }));
    const issueModelModel = {
      findById: vi
        .fn()
        .mockResolvedValueOnce(currentModel)
        .mockReturnValueOnce({ select }),
    };

    await expect(
      updateAdminModelCatalogVisibility(
        {
          modelId: currentModel._id,
          visibleInIssueCreation: false,
        },
        { issueModelModel, isValidModelId: () => true }
      )
    ).resolves.toMatchObject({
      model: {
        id: currentModel._id,
        name: "Updated",
        visibleInIssueCreation: false,
      },
    });

    expect(currentModel.set).toHaveBeenCalledWith({
      visibleInIssueCreation: false,
    });
    expect(currentModel.save).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledWith("-__v");
  });
});
