import mongoose from "mongoose";

import { IssueModel } from "../../models/IssueModels.js";
import { runModelManifestDryRun } from "../../services/modelApi/modelManifestDryRun.js";
import { syncModelManifestToIssueModels } from "../../services/modelApi/modelManifestSync.js";
import { connectDemoDatabaseOrThrow } from "./assertIsolatedDemoEnvironment.js";

const AHP_SORT_I_KEY = "ahp_sort_i";
const assertNoDeleteCandidates = (preview, label) => {
  if (preview.summary.deletedCandidates.length > 0) {
    throw new Error(`${label} found managed-model deletion candidates; refusing synchronization.`);
  }
};

const assertScopedResult = (report) => {
  const summary = report?.summary || {};
  const changedKeys = [
    ...(report.created || []),
    ...(report.updated || []),
    ...(report.unchanged || []),
    ...(report.deleted || []),
  ].map((entry) => entry.apiModelKey);
  if (
    summary.created !== 0 ||
    summary.deleted !== 0 ||
    changedKeys.some((key) => key !== AHP_SORT_I_KEY)
  ) {
    throw new Error("Scoped AHPSort I synchronization reported an unexpected catalog change.");
  }
};

const syncDemoModelCatalog = async () => {
  const target = await connectDemoDatabaseOrThrow();
  const fullPreview = await runModelManifestDryRun();
  assertNoDeleteCandidates(fullPreview, "Initial full-catalog dry-run");
  if (!fullPreview.modelRows.some((row) => row.apiModelKey === AHP_SORT_I_KEY)) {
    throw new Error("AHPSort I is missing from the DecisionModelsService manifest preview.");
  }

  const fullReport = await syncModelManifestToIssueModels();
  if ((fullReport.summary?.deleted || 0) !== 0) {
    throw new Error("Initial full-catalog synchronization unexpectedly deleted model records.");
  }

  const modelBeforeScopedSync = await IssueModel.findOne({ apiModelKey: AHP_SORT_I_KEY }).lean();
  if (
    !modelBeforeScopedSync ||
    modelBeforeScopedSync.implementationStatus !== "ready" ||
    modelBeforeScopedSync.issueExecutionAuthorized !== true ||
    modelBeforeScopedSync.visibleInIssueCreation !== true ||
    modelBeforeScopedSync.supportsConsensus !== false ||
    modelBeforeScopedSync.supportsConsensusSimulation !== false
  ) {
    throw new Error("AHPSort I was not initialized as a visible, ready, individually authorized demo model.");
  }

  const scopedPreview = await runModelManifestDryRun({ apiModelKeys: [AHP_SORT_I_KEY] });
  assertNoDeleteCandidates(scopedPreview, "AHPSort I scoped dry-run");
  if (
    scopedPreview.modelRows.length !== 1 ||
    scopedPreview.modelRows[0].apiModelKey !== AHP_SORT_I_KEY
  ) {
    throw new Error("Scoped dry-run did not contain exactly the AHPSort I model.");
  }

  const scopedReport = await syncModelManifestToIssueModels({ apiModelKeys: [AHP_SORT_I_KEY] });
  assertScopedResult(scopedReport);

  const modelAfterScopedSync = await IssueModel.findOne({ apiModelKey: AHP_SORT_I_KEY }).lean();
  if (
    modelAfterScopedSync?.issueExecutionAuthorized !== true ||
    modelAfterScopedSync?.visibleInIssueCreation !== true ||
    modelAfterScopedSync?.supportsConsensus !== false ||
    modelAfterScopedSync?.supportsConsensusSimulation !== false
  ) {
    throw new Error("AHPSort I catalog state changed unexpectedly after scoped synchronization.");
  }

  console.log(
    `Official catalog initialization completed only in ${target.databaseName}: ` +
      `${fullReport.summary?.created || 0} model records initialized, no model deletions; ` +
      `scoped apiModelKeys=[${AHP_SORT_I_KEY}] reported ` +
      `${scopedReport.summary?.updated || 0} updated and ${scopedReport.summary?.unchanged || 0} unchanged.`,
  );
};

try {
  await syncDemoModelCatalog();
} catch (error) {
  console.error("Demo model-catalog synchronization failed:", error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
