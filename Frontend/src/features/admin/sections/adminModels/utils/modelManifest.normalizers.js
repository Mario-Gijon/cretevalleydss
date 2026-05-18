import { asArray, count } from "./modelManifest.formatters";
import { getSyncState } from "./modelManifest.severity";

export const normalizeRowsFromDryRun = (report) => {
  if (Array.isArray(report?.modelRows)) {
    return report.modelRows.map((row) => ({
      ...row,
      syncState: getSyncState(row),
    }));
  }

  const rows = [];

  asArray(report?.matches).forEach((match) => {
    rows.push({
      apiModelKey: match.manifestKey,
      displayName: match.manifestDisplayName,
      mongoName: match.mongoName,
      mongoId: match.mongoId,
      matched: true,
      matchedBy: match.matchedBy,
      differences: asArray(match.differences),
      syncState: count(match.differences) > 0 ? "Has differences" : "Synced",
    });
  });

  asArray(report?.summary?.missingInMongo).forEach((item) => {
    rows.push({
      apiModelKey: item.key,
      displayName: item.displayName,
      reason: item.reason,
      syncState: "Missing in Mongo",
    });
  });

  asArray(report?.summary?.missingInManifest).forEach((item) => {
    rows.push({
      mongoName: item.mongoName,
      mongoId: item.mongoId,
      reason: item.reason,
      syncState: "Missing in manifest",
    });
  });

  asArray(report?.summary?.notSyncable).forEach((item) => {
    rows.push({
      apiModelKey: item.key,
      displayName: item.key,
      lifecycleKind: item.lifecycleKind || null,
      isIssueModel: item.isIssueModel ?? null,
      safeToCreateIssueModel: item.safeToCreateIssueModel,
      reason: item.reason,
      syncState: "Not syncable",
    });
  });

  return rows;
};

export const getCatalogSyncState = (model = {}) => {
  if (model?.manifestSync?.isStale) return "Stale";
  if (model?.manifestSync?.lastSyncedAt) return "Synced";
  if (model?.apiModelKey) return "Available";
  return "Unknown";
};

export const normalizeRowsFromCatalog = (models = []) =>
  asArray(models).map((model) => ({
    apiModelKey: model?.apiModelKey || null,
    displayName: model?.name || "Unknown model",
    mongoName: model?.name || "Unknown model",
    mongoId: model?.id || model?._id || null,
    isIssueModel: model?.isIssueModel === true,
    visibleInIssueCreation: model?.visibleInIssueCreation !== false,
    apiInputFormat: model?.apiInputFormat || null,
    apiOutputFormat: model?.apiOutputFormat || null,
    modelInputFields: asArray(model?.modelInputFields),
    modelOutputFields: asArray(model?.modelOutputFields),
    lifecycleKind: model?.lifecycleKind || null,
    criterionTypes: asArray(model?.criterionTypes),
    safeToCreateIssueModel: null,
    alternativeEvaluationStructureKey:
      model?.alternativeEvaluationStructureKey || null,
    criteriaWeightingStructureKey:
      model?.criteriaWeightingStructureKey || null,
    isConsensus: model?.isConsensus,
    isMultiCriteria: model?.isMultiCriteria,
    supportedDomains: model?.supportedDomains || null,
    endpoint: model?.apiEndpoint || null,
    parameters: asArray(model?.parameters),
    request: model?.request ?? null,
    response: model?.response ?? null,
    manifestSync: model?.manifestSync || null,
    smallDescription: model?.smallDescription,
    extendDescription: model?.extendDescription,
    moreInfoUrl: model?.moreInfoUrl,
    matched: Boolean(model?.apiModelKey),
    matchedBy: model?.apiModelKey ? "apiModelKey" : null,
    differences: [],
    reason: null,
    syncState: getCatalogSyncState(model),
  }));

export const normalizeModelIdentity = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[-_\s]+/g, " ");

export const getRowIdentityCandidates = (row = {}) =>
  [row.apiModelKey, row.mongoId, row.mongoName, row.displayName]
    .map(normalizeModelIdentity)
    .filter(Boolean);

export const indexDryRunRows = (rows) => {
  const index = new Map();

  asArray(rows).forEach((row) => {
    getRowIdentityCandidates(row).forEach((identity) => {
      if (!index.has(identity)) {
        index.set(identity, row);
      }
    });
  });

  return index;
};

export const enrichCatalogRowsWithDryRun = (catalogRows, dryRunRows) => {
  if (asArray(dryRunRows).length === 0) return catalogRows;

  const dryRunIndex = indexDryRunRows(dryRunRows);

  return asArray(catalogRows).map((row) => {
    const dryRunRow = getRowIdentityCandidates(row)
      .map((identity) => dryRunIndex.get(identity))
      .find(Boolean);

    if (!dryRunRow) return row;

    const differences = asArray(dryRunRow.differences);
    const dryRunSyncState = getSyncState(dryRunRow);
    const syncState =
      differences.length > 0 ||
        ["Has differences", "Missing in manifest", "Review needed", "Stale"].includes(
          dryRunSyncState
        )
        ? dryRunSyncState
        : row.syncState;

    return {
      ...row,
      matched: dryRunRow.matched ?? row.matched,
      matchedBy: dryRunRow.matchedBy ?? row.matchedBy,
      differences,
      reason: dryRunRow.reason || row.reason,
      dryRunSyncState,
      syncState,
    };
  });
};

export const flattenTechnicalDifferences = (report) =>
  asArray(report?.summary?.technicalDifferences).flatMap((item) =>
    asArray(item?.differences).map((difference) => ({
      model: item?.manifestKey || item?.mongoName || "Unknown model",
      mongoId: item?.mongoId || null,
      field: difference?.field || "unknown",
      mongoValue: difference?.mongoValue,
      manifestValue: difference?.manifestValue,
      reason: difference?.reason || null,
    }))
  );

export function sortModelRowsByName(rows = []) {
  return [...rows].sort((a, b) => {
    const nameA = (
      a.displayName ||
      a.mongoName ||
      a.name ||
      a.apiModelKey ||
      ""
    ).toString();

    const nameB = (
      b.displayName ||
      b.mongoName ||
      b.name ||
      b.apiModelKey ||
      ""
    ).toString();

    return nameA.localeCompare(nameB, "en", {
      sensitivity: "base",
      numeric: true,
    });
  });
}
