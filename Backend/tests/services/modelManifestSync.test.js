import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/modelApi/modelManifestClient.js", () => ({
  fetchModelManifest: vi.fn(),
}));

import { IssueModel } from "../../models/IssueModels.js";
import { fetchModelManifest } from "../../services/modelApi/modelManifestClient.js";
import { buildModelManifestDryRunReport } from "../../services/modelApi/modelManifestDryRun.js";
import {
  buildManifestTechnicalProjection,
  buildTechnicalPayload,
} from "../../services/modelApi/modelManifest.mapper.js";
import { syncModelManifestToIssueModels } from "../../services/modelApi/modelManifestSync.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const issueManifestModel = (overrides = {}) => ({
  apiModelKey: "manifest-ranking-model",
  displayName: "Manifest ranking model",
  modelKind: "issue",
  evaluationStructureKey: "alternativeCriteriaMatrix",
  resultStructureKey: "ranking",
  resultStructureVersion: 1,
  implementationStatus: "ready",
  publicUsable: true,
  apiEndpoint: { method: "POST", path: "/ranking" },
  smallDescription: "Ranking model",
  extendedDescription: "A ranking model for tests.",
  modelSection: {
    whatItDoes: "Ranks alternatives.",
    whenToUse: "When a ranking is required.",
    advantages: [],
    limitations: [],
  },
  requiresHomogeneousExpressionDomains: false,
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  isMultiCriteria: true,
  usesCriteriaWeights: false,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: false,
  supportedExpressionDomains: [],
  parameters: [],
  request: { example: null },
  response: { example: null },
  ...overrides,
});

const technicalMongoModel = (manifestModel, now = new Date()) => {
  const payload = buildTechnicalPayload({
    manifest: { models: [manifestModel] },
    manifestModel,
    now,
  });
  delete payload.resultStructureKey;
  delete payload.resultStructureVersion;
  payload.visibleInIssueCreation = true;
  payload.visibleInCriteriaWeighting = false;
  return payload;
};

describe("result structure metadata in manifest synchronization", () => {
  beforeEach(() => {
    fetchModelManifest.mockReset();
  });

  it("persists result structure metadata for newly synchronized issue models", async () => {
    const manifestModel = issueManifestModel();
    fetchModelManifest.mockResolvedValue({ models: [manifestModel] });

    const result = await syncModelManifestToIssueModels();
    const persisted = await IssueModel.findOne({
      apiModelKey: manifestModel.apiModelKey,
    }).lean();

    expect(result.summary.created).toBe(1);
    expect(persisted).toMatchObject({
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
    });
  });

  it("treats a legacy model with both fields absent as ranking version 1 without rewriting it", async () => {
    const manifestModel = issueManifestModel();
    const legacyModel = await IssueModel.create(
      technicalMongoModel(manifestModel)
    );
    fetchModelManifest.mockResolvedValue({ models: [manifestModel] });

    const result = await syncModelManifestToIssueModels();
    const persisted = await IssueModel.findById(legacyModel._id).lean();

    expect(result.summary.unchanged).toBe(1);
    expect(persisted).not.toHaveProperty("resultStructureKey");
    expect(persisted).not.toHaveProperty("resultStructureVersion");

    const dryRun = await buildModelManifestDryRunReport({
      manifest: { models: [manifestModel] },
      issueModels: [persisted],
    });
    expect(dryRun.summary.technicalDifferences).toEqual([]);
    expect(dryRun.modelRows[0]).toMatchObject({
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
      syncState: "Synced",
    });
  });

  it("reports and synchronizes a changed result structure version", async () => {
    const manifestModel = issueManifestModel();
    const currentPayload = technicalMongoModel(manifestModel);
    currentPayload.resultStructureKey = "ranking";
    currentPayload.resultStructureVersion = 2;
    const localModel = await IssueModel.create(currentPayload);

    const dryRun = await buildModelManifestDryRunReport({
      manifest: { models: [manifestModel] },
      issueModels: [localModel.toObject()],
    });
    expect(dryRun.summary.technicalDifferences[0].differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "resultStructureMetadata",
          manifestValue: {
            resultStructureKey: "ranking",
            resultStructureVersion: 1,
          },
          mongoValue: {
            resultStructureKey: "ranking",
            resultStructureVersion: 2,
          },
          reason: expect.stringContaining("Unsupported resultStructureVersion"),
        }),
      ])
    );

    fetchModelManifest.mockResolvedValue({ models: [manifestModel] });
    const result = await syncModelManifestToIssueModels();
    const persisted = await IssueModel.findById(localModel._id).lean();

    expect(result.summary.updated).toBe(1);
    expect(result.updated[0].updatedFields).toContain(
      "resultStructureVersion"
    );
    expect(persisted).toMatchObject({ resultStructureKey: "ranking", resultStructureVersion: 1 });
  });

  it("skips unsupported metadata before creating an IssueModel", async () => {
    fetchModelManifest.mockResolvedValue({
      models: [
        issueManifestModel({ resultStructureKey: "unsupported-structure" }),
      ],
    });

    const result = await syncModelManifestToIssueModels();

    expect(result.summary.skipped).toBe(1);
    expect(result.skipped[0].missingFields).toEqual([
      expect.stringContaining("Unsupported resultStructureKey 'unsupported-structure'")
    ]);
    expect(await IssueModel.countDocuments()).toBe(0);
  });

  it("does not stale or delete an existing model when its manifest metadata is invalid", async () => {
    const existingModel = await IssueModel.create(
      technicalMongoModel(issueManifestModel())
    );
    const invalidManifestModel = issueManifestModel({
      resultStructureKey: "unsupported-structure",
    });
    fetchModelManifest.mockResolvedValue({ models: [invalidManifestModel] });

    const syncResult = await syncModelManifestToIssueModels();
    const persisted = await IssueModel.findById(existingModel._id).lean();
    const dryRun = await buildModelManifestDryRunReport({
      manifest: { models: [invalidManifestModel] },
      issueModels: [persisted],
    });

    expect(syncResult.summary.skipped).toBe(1);
    expect(syncResult.summary.deleted).toBe(0);
    expect(persisted.visibleInIssueCreation).toBe(true);
    expect(persisted.manifestSync.isStale).toBe(false);
    expect(dryRun.summary.invalidManifestRuntimeFields).toHaveLength(1);
    expect(dryRun.summary.deletedCandidates).toEqual([]);
  });

  it("keeps criteriaWeighting synchronization independent of result metadata", async () => {
    const manifestModel = issueManifestModel({
      apiModelKey: "manual-criteria-weights",
      displayName: "Manual criteria weights",
      modelKind: "criteriaWeighting",
      evaluationStructureKey: "manualCriteriaWeights",
      supportsCreatorCriteriaWeighting: true,
      supportsExpertCriteriaWeighting: false,
    });
    delete manifestModel.resultStructureKey;
    delete manifestModel.resultStructureVersion;
    fetchModelManifest.mockResolvedValue({ models: [manifestModel] });

    const result = await syncModelManifestToIssueModels();
    const persisted = await IssueModel.findOne({
      apiModelKey: manifestModel.apiModelKey,
    }).lean();
    const projection = buildManifestTechnicalProjection(manifestModel);

    expect(result.summary.created).toBe(1);
    expect(persisted.modelKind).toBe("criteriaWeighting");
    expect(persisted).not.toHaveProperty("resultStructureKey");
    expect(persisted).not.toHaveProperty("resultStructureVersion");
    expect(projection).not.toHaveProperty("resultStructureKey");
    expect(projection).not.toHaveProperty("resultStructureVersion");
  });
});
