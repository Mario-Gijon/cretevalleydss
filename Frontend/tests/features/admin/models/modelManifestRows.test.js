import { describe, expect, it } from "vitest";

import {
  flattenModelManifestTechnicalDifferences,
  mergeModelCatalogRowsWithDryRun,
  normalizeModelCatalogRows,
  normalizeModelManifestDryRunRows,
  sortModelManifestRowsByName,
} from "../../../../src/features/admin/models/logic/buildModelManifestRows.js";
import {
  buildAdminCatalogModelsFixture,
  buildAdminDryRunLegacyReportFixture,
  buildAdminDryRunModernReportFixture,
} from "../../../mocks/fixtures/adminModels.fixtures.js";

describe("buildModelManifestRows", () => {
  it("normalizes catalog rows from mixed Mongo payload shapes", () => {
    const rows = normalizeModelCatalogRows(buildAdminCatalogModelsFixture());

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      apiModelKey: "budget_optimizer",
      displayName: "Budget Optimizer 10",
      mongoId: "mongo-issue-model",
      modelKind: "issue",
      implementationStatus: "ready",
      visibleInIssueCreation: true,
      protectedHistoricalModel: false,
      apiInputFormat: "json",
      apiOutputFormat: "json",
      usesCriteriaWeights: true,
      isConsensus: true,
      parameters: [{ key: "alpha", parameterStructureKey: "numberGlobal" }],
      syncState: "Synced",
    });
    expect(rows[1]).toMatchObject({
      mongoId: "mongo-criteria-model",
      modelKind: "criteriaWeighting",
      implementationStatus: "scaffold",
      visibleInCriteriaWeighting: false,
      syncState: "Available",
    });
    expect(rows[2]).toMatchObject({
      displayName: "Unknown model",
      mongoId: "mongo-protected-model",
      implementationStatus: "ready",
      publicUsable: false,
      protectedHistoricalModel: true,
      modelInputFields: [],
      modelOutputFields: [],
      parameters: [],
      syncState: "Missing from manifest",
    });
  });

  it("normalizes modern dry-run rows and annotates sync state", () => {
    const rows = normalizeModelManifestDryRunRows(buildAdminDryRunModernReportFixture());

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      apiModelKey: "budget_optimizer",
      syncState: "Has differences",
    });
    expect(rows[1]).toMatchObject({
      apiModelKey: "weights_builder",
      syncState: "Synced",
    });
  });

  it("normalizes legacy dry-run reports and handles malformed input safely", () => {
    const rows = normalizeModelManifestDryRunRows(buildAdminDryRunLegacyReportFixture());

    expect(rows).toEqual([
      expect.objectContaining({
        apiModelKey: "budget_optimizer",
        matched: true,
        matchedBy: "apiModelKey",
        syncState: "Synced",
      }),
      expect.objectContaining({
        apiModelKey: "new_service_model",
        syncState: "Missing in Mongo",
      }),
      expect.objectContaining({
        mongoId: "mongo-legacy-model",
        syncState: "Will be deleted",
      }),
      expect.objectContaining({
        mongoId: "mongo-historic-model",
        syncState: "Protected historical model",
      }),
      expect.objectContaining({
        apiModelKey: "service_model",
        syncState: "Not syncable",
      }),
    ]);
    expect(normalizeModelManifestDryRunRows(null)).toEqual([]);
  });

  it("merges catalog and dry-run rows by identity without mutating inputs", () => {
    const catalogRows = normalizeModelCatalogRows(buildAdminCatalogModelsFixture());
    const dryRunRows = normalizeModelManifestDryRunRows(
      buildAdminDryRunLegacyReportFixture()
    );
    const catalogSnapshot = structuredClone(catalogRows);
    const dryRunSnapshot = structuredClone(dryRunRows);

    const merged = mergeModelCatalogRowsWithDryRun(catalogRows, dryRunRows);

    expect(merged[0]).toMatchObject({
      apiModelKey: "budget_optimizer",
      matched: true,
      matchedBy: "apiModelKey",
      dryRunSyncState: "Synced",
      syncState: "Synced",
    });
    expect(merged[2]).toMatchObject({
      mongoId: "mongo-protected-model",
      syncState: "Missing from manifest",
    });
    expect(catalogRows).toEqual(catalogSnapshot);
    expect(dryRunRows).toEqual(dryRunSnapshot);
  });

  it("sorts rows case-insensitively with numeric support and safe missing-name handling", () => {
    const sorted = sortModelManifestRowsByName([
      { displayName: "model 10" },
      { displayName: "Model 2" },
      { apiModelKey: "alpha" },
      {},
    ]);

    expect(
      sorted.map((row) => row.displayName || row.mongoName || row.name || row.apiModelKey || "")
    ).toEqual(["", "alpha", "Model 2", "model 10"]);
  });

  it("flattens technical differences safely from partial dry-run reports", () => {
    const differences = flattenModelManifestTechnicalDifferences(
      buildAdminDryRunLegacyReportFixture()
    );

    expect(differences).toEqual([
      {
        model: "budget_optimizer",
        mongoId: "mongo-issue-model",
        field: "endpoint",
        mongoValue: "/old",
        manifestValue: "/new",
        reason: "Manifest changed",
      },
    ]);
    expect(flattenModelManifestTechnicalDifferences({ summary: {} })).toEqual([]);
  });
});
