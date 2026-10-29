import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/modelApi/modelManifestClient.js", () => ({
  fetchModelManifest: vi.fn(),
}));

import { IssueModel } from "../../models/IssueModels.js";
import { fetchModelManifest } from "../../services/modelApi/modelManifestClient.js";
import {
  buildModelManifestDryRunReport,
  runModelManifestDryRun,
} from "../../services/modelApi/modelManifestDryRun.js";
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
  issueExecutionAuthorized: true,
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

  it("runs an unscoped dry-run when no apiModelKeys scope is requested", async () => {
    const manifestModel = issueManifestModel();
    await IssueModel.create(technicalMongoModel(manifestModel));
    fetchModelManifest.mockResolvedValue({ models: [manifestModel] });

    const dryRun = await runModelManifestDryRun();

    expect(dryRun).not.toHaveProperty("scope");
    expect(dryRun.modelRows).toHaveLength(1);
    expect(dryRun.modelRows[0]).toMatchObject({
      apiModelKey: manifestModel.apiModelKey,
      syncState: "Synced",
    });
    expect(dryRun.summary.deletedCandidates).toEqual([]);
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
      issueExecutionAuthorized: true,
    });
  });

  it("migrates a historical ranking model without authorization metadata from the manifest", async () => {
    const manifestModel = issueManifestModel();
    const historicalPayload = technicalMongoModel(manifestModel);
    delete historicalPayload.issueExecutionAuthorized;
    const historicalModel = await IssueModel.create(historicalPayload);
    fetchModelManifest.mockResolvedValue({ models: [manifestModel] });

    const result = await syncModelManifestToIssueModels();
    const persisted = await IssueModel.findById(historicalModel._id).lean();

    expect(result.summary.updated).toBe(1);
    expect(result.updated[0].updatedFields).toContain(
      "issueExecutionAuthorized"
    );
    expect(persisted.issueExecutionAuthorized).toBe(true);
  });

  it("updates a persisted TOPSIS-Sort scaffold from the ready manifest and preserves Admin visibility", async () => {
    const previousManifestModel = issueManifestModel({
      apiModelKey: "topsis_sort_2016",
      displayName: "TOPSIS-SORT",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      implementationStatus: "scaffold",
      publicUsable: false,
      issueExecutionAuthorized: false,
    });
    const previousPayload = technicalMongoModel(previousManifestModel);
    previousPayload.resultStructureKey = "sorting";
    previousPayload.resultStructureVersion = 1;
    previousPayload.visibleInIssueCreation = false;
    await IssueModel.create(previousPayload);

    const readyManifestModel = issueManifestModel({
      apiModelKey: "topsis_sort_2016",
      displayName: "TOPSIS-SORT",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      implementationStatus: "ready",
      publicUsable: true,
      issueExecutionAuthorized: true,
      supportsConsensus: false,
      supportsConsensusSimulation: false,
    });
    fetchModelManifest.mockResolvedValue({ models: [readyManifestModel] });

    const result = await syncModelManifestToIssueModels();
    const persisted = await IssueModel.findOne({
      apiModelKey: "topsis_sort_2016",
    }).lean();

    expect(result.summary.updated).toBe(1);
    expect(result.summary.deleted).toBe(0);
    expect(result.updated[0].updatedFields).toEqual(
      expect.arrayContaining([
        "implementationStatus",
        "publicUsable",
        "issueExecutionAuthorized",
      ])
    );
    expect(persisted).toMatchObject({
      apiModelKey: "topsis_sort_2016",
      name: "TOPSIS-SORT",
      implementationStatus: "ready",
      publicUsable: true,
      issueExecutionAuthorized: true,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      visibleInIssueCreation: false,
      supportsConsensus: false,
      supportsConsensusSimulation: false,
      manifestSync: { isStale: false },
    });
  });

  it("fails closed when an issue model manifest omits per-model authorization", async () => {
    const modelWithoutAuthorization = issueManifestModel();
    delete modelWithoutAuthorization.issueExecutionAuthorized;
    fetchModelManifest.mockResolvedValue({
      models: [modelWithoutAuthorization],
    });

    const result = await syncModelManifestToIssueModels();

    expect(result.summary.skipped).toBe(1);
    expect(result.skipped[0].missingFields).toContain(
      "issueExecutionAuthorized"
    );
    expect(await IssueModel.countDocuments()).toBe(0);
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
    delete manifestModel.issueExecutionAuthorized;
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

describe("scoped model manifest synchronization", () => {
  const apiModelKey = "ahp_sort_i";
  const scope = { apiModelKeys: [apiModelKey] };

  const ahpSortManifestModel = (overrides = {}) =>
    issueManifestModel({
      apiModelKey,
      displayName: "AHPSort I",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      evaluationStructureKey: "ahpSortAlternativeProfiles",
      modelSection: {
        whatItDoes: "Classifies alternatives into ordered categories.",
        whenToUse: "Use AHP comparisons for alternatives and profiles.",
        advantages: ["Supports limiting and central profiles."],
        limitations: [
          "Multi-expert classification uses unweighted category voting.",
        ],
      },
      parameters: [
        {
          key: "orderedCategories",
          label: "Ordered categories",
          parameterStructureKey: "orderedCategories",
          required: true,
        },
        {
          key: "ahpSortProfiles",
          label: "AHPSort I profiles",
          parameterStructureKey: "ahpSortProfiles",
          required: true,
        },
        {
          key: "ahpSortGroup",
          label: "Group classification",
          parameterStructureKey: "ahpSortGroup",
          required: false,
          description: "Choose the group tie-breaking policy.",
        },
      ],
      ...overrides,
    });

  const ahpSortPersistedModel = async (manifestModel, overrides = {}) => {
    const payload = technicalMongoModel(manifestModel);
    payload.resultStructureKey = "sorting";
    payload.resultStructureVersion = 1;
    payload.visibleInIssueCreation = true;
    payload.supportsConsensus = false;
    payload.modelSection.limitations = [
      "Multi-expert aggregation of alternative/profile judgments is not supported yet.",
    ];
    return IssueModel.create({ ...payload, ...overrides });
  };

  beforeEach(() => {
    fetchModelManifest.mockReset();
  });

  it("dry-runs and synchronizes only the requested existing AHPSort I row", async () => {
    const manifestModel = ahpSortManifestModel();
    const previousModel = ahpSortManifestModel({
      parameters: manifestModel.parameters.slice(0, 2),
      modelSection: {
        ...manifestModel.modelSection,
        limitations: [
          "Multi-expert aggregation of alternative/profile judgments is not supported yet.",
        ],
      },
    });
    const target = await ahpSortPersistedModel(previousModel, {
      visibleInIssueCreation: false,
    });
    const otherManifestModel = issueManifestModel({
      apiModelKey: "unrelated-managed-model",
    });
    const otherManaged = await IssueModel.create(
      technicalMongoModel(otherManifestModel)
    );
    const e2eFixture = await IssueModel.create(
      technicalMongoModel(
        issueManifestModel({ apiModelKey: "e2e_unmanaged_fixture" })
      )
    );
    const nonTargetBefore = await IssueModel.find({
      apiModelKey: { $ne: apiModelKey },
    })
      .sort({ apiModelKey: 1, _id: 1 })
      .lean();
    fetchModelManifest.mockResolvedValue({
      models: [manifestModel, otherManifestModel],
    });

    const dryRun = await runModelManifestDryRun(scope);

    expect(dryRun.scope).toEqual({
      apiModelKeys: [apiModelKey],
      createsAllowed: false,
      deletionsAllowed: false,
      orphanReconciliation: false,
    });
    expect(dryRun.manifest).toEqual({
      totalModels: 1,
      syncableModels: 1,
      nonSyncableModels: 0,
    });
    expect(dryRun.matches).toHaveLength(1);
    expect(dryRun.matches[0]).toMatchObject({
      manifestKey: apiModelKey,
      mongoId: String(target._id),
      status: "matched",
    });
    expect(dryRun.summary.technicalDifferences).toHaveLength(1);
    expect(dryRun.summary.technicalDifferences[0]).toMatchObject({
      apiModelKey,
      mongoId: String(target._id),
      differences: expect.arrayContaining([
        expect.objectContaining({ field: "parameters" }),
        expect.objectContaining({ field: "modelSection" }),
      ]),
    });
    expect(dryRun.summary.missingInMongo).toEqual([]);
    expect(dryRun.summary.deletedCandidates).toEqual([]);
    expect(dryRun.summary.blockedDeletions).toEqual([]);
    expect(dryRun.modelRows).toHaveLength(1);

    const result = await syncModelManifestToIssueModels(scope);
    const targetAfter = await IssueModel.findById(target._id).lean();
    const nonTargetAfter = await IssueModel.find({
      apiModelKey: { $ne: apiModelKey },
    })
      .sort({ apiModelKey: 1, _id: 1 })
      .lean();

    expect(result.summary).toMatchObject({
      created: 0,
      updated: 1,
      unchanged: 0,
      deleted: 0,
      blockedDeletions: 0,
    });
    expect(result.updated).toHaveLength(1);
    expect(result.updated[0]).toMatchObject({
      apiModelKey,
      mongoId: String(target._id),
    });
    expect(result.scope).toBeUndefined();
    expect(result.manifest.scope).toEqual(dryRun.scope);
    expect(result.manifest.totalModels).toBe(1);
    expect(result.manifest.syncableModels).toBe(1);
    expect(targetAfter).toMatchObject({
      apiModelKey,
      implementationStatus: "ready",
      publicUsable: true,
      issueExecutionAuthorized: true,
      visibleInIssueCreation: false,
      supportsConsensus: false,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      parameters: buildTechnicalPayload({
        manifest: { models: [manifestModel] },
        manifestModel,
      }).parameters,
      modelSection: manifestModel.modelSection,
    });
    expect(nonTargetAfter).toEqual(nonTargetBefore);
    expect(nonTargetAfter.map(({ _id }) => String(_id)).sort()).toEqual(
      [String(otherManaged._id), String(e2eFixture._id)].sort()
    );
  });

  it("rejects missing, ambiguous, duplicated, and malformed scopes before writing", async () => {
    const manifestModel = ahpSortManifestModel();
    fetchModelManifest.mockResolvedValue({ models: [manifestModel] });

    await expect(
      syncModelManifestToIssueModels({ apiModelKeys: ["missing_model"] })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(await IssueModel.countDocuments()).toBe(0);

    const first = await ahpSortPersistedModel(manifestModel);
    const duplicate = await ahpSortPersistedModel(manifestModel, {
      name: "Duplicate AHPSort I",
    });
    await expect(syncModelManifestToIssueModels(scope)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(await IssueModel.countDocuments()).toBe(2);
    expect((await IssueModel.find().lean()).map(({ _id }) => String(_id)).sort()).toEqual(
      [String(first._id), String(duplicate._id)].sort()
    );

    await expect(
      syncModelManifestToIssueModels({ apiModelKeys: [apiModelKey, apiModelKey] })
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(syncModelManifestToIssueModels({ apiModelKeys: [] })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(
      syncModelManifestToIssueModels({ apiModelKeys: [" "] })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(await IssueModel.countDocuments()).toBe(2);
  });

  it("requires one exact manifest entry in scoped dry-run and sync", async () => {
    const manifestModel = ahpSortManifestModel();
    await ahpSortPersistedModel(manifestModel);
    fetchModelManifest.mockResolvedValue({
      models: [manifestModel, { ...manifestModel }],
    });

    await expect(runModelManifestDryRun(scope)).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(syncModelManifestToIssueModels(scope)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(await IssueModel.countDocuments()).toBe(1);
  });
});
