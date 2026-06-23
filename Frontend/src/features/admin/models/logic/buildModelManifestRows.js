import { getModelManifestSyncState } from "./getModelManifestSeverity";

const asList = (value) => (Array.isArray(value) ? value : []);
const countEntries = (value) => asList(value).length;

const getCatalogSyncState = (model = {}) => {
  if (model?.manifestSync?.isStale) return "Stale";
  if (model?.manifestSync?.lastSyncedAt) return "Synced";
  if (model?.apiModelKey) return "Available";
  return "Unknown";
};

const normalizeModelManifestIdentity = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[-_\s]+/g, " ");

const getModelManifestIdentityCandidates = (row = {}) =>
  [row.apiModelKey, row.mongoId, row.mongoName, row.displayName]
    .map(normalizeModelManifestIdentity)
    .filter(Boolean);

const indexModelManifestRows = (rows) => {
  const index = new Map();

  asList(rows).forEach((row) => {
    getModelManifestIdentityCandidates(row).forEach((identity) => {
      if (!index.has(identity)) {
        index.set(identity, row);
      }
    });
  });

  return index;
};

export const normalizeModelManifestDryRunRows = (report) => {
  if (Array.isArray(report?.modelRows)) {
    return report.modelRows.map((row) => ({
      ...row,
      syncState: getModelManifestSyncState(row),
    }));
  }

  const rows = [];

  asList(report?.matches).forEach((match) => {
    rows.push({
      apiModelKey: match.manifestKey,
      displayName: match.manifestDisplayName,
      mongoName: match.mongoName,
      mongoId: match.mongoId,
      matched: true,
      matchedBy: match.matchedBy,
      differences: asList(match.differences),
      syncState: countEntries(match.differences) > 0 ? "Has differences" : "Synced",
    });
  });

  asList(report?.summary?.missingInMongo).forEach((item) => {
    rows.push({
      apiModelKey: item.key,
      displayName: item.displayName,
      reason: item.reason,
      syncState: "Missing in Mongo",
    });
  });

  asList(report?.summary?.missingInManifest).forEach((item) => {
    rows.push({
      mongoName: item.mongoName,
      mongoId: item.mongoId,
      reason: item.reason,
      syncState: "Missing in manifest",
    });
  });

  asList(report?.summary?.notSyncable).forEach((item) => {
    rows.push({
      apiModelKey: item.apiModelKey || null,
      displayName: item.displayName || item.apiModelKey || null,
      lifecycleKind: item.lifecycleKind || null,
      modelKind: item.modelKind || null,
      safeToCreateIssueModel: item.safeToCreateIssueModel,
      reason: item.reason,
      syncState: "Not syncable",
    });
  });

  return rows;
};

export const normalizeModelCatalogRows = (models = []) =>
  asList(models).map((model) => ({
    apiModelKey: model?.apiModelKey || null,
    displayName: model?.name || "Unknown model",
    mongoName: model?.name || "Unknown model",
    mongoId: model?.id || model?._id || null,
    modelKind: model?.modelKind || null,
    implementationStatus: model?.implementationStatus || "ready",
    publicUsable: model?.publicUsable !== false,
    visibleInIssueCreation: model?.visibleInIssueCreation !== false,
    visibleInCriteriaWeighting: model?.visibleInCriteriaWeighting !== false,
    apiInputFormat: model?.apiInputFormat || null,
    apiOutputFormat: model?.apiOutputFormat || null,
    modelInputFields: asList(model?.modelInputFields),
    modelOutputFields: asList(model?.modelOutputFields),
    lifecycleKind: model?.lifecycleKind || null,
    safeToCreateIssueModel: null,
    evaluationStructureKey: model?.evaluationStructureKey || null,
    usesCriteriaWeights: model?.usesCriteriaWeights === true,
    usesExpertWeights: model?.usesExpertWeights === true,
    usesFuzzyCriteriaWeights: model?.usesFuzzyCriteriaWeights === true,
    usesCriterionTypes: model?.usesCriterionTypes === true,
    isConsensus: model?.supportsConsensus === true,
    isMultiCriteria: model?.isMultiCriteria,
    supportedDomains: model?.supportedDomains || null,
    endpoint: model?.apiEndpoint || null,
    parameters: asList(model?.parameters),
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

export const mergeModelCatalogRowsWithDryRun = (catalogRows, dryRunRows) => {
  if (asList(dryRunRows).length === 0) return catalogRows;

  const dryRunIndex = indexModelManifestRows(dryRunRows);

  return asList(catalogRows).map((row) => {
    const dryRunRow = getModelManifestIdentityCandidates(row)
      .map((identity) => dryRunIndex.get(identity))
      .find(Boolean);

    if (!dryRunRow) return row;

    const differences = asList(dryRunRow.differences);
    const dryRunSyncState = getModelManifestSyncState(dryRunRow);
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

export const flattenModelManifestTechnicalDifferences = (report) =>
  asList(report?.summary?.technicalDifferences).flatMap((item) =>
    asList(item?.differences).map((difference) => ({
      model: item?.manifestKey || item?.mongoName || "Unknown model",
      mongoId: item?.mongoId || null,
      field: difference?.field || "unknown",
      mongoValue: difference?.mongoValue,
      manifestValue: difference?.manifestValue,
      reason: difference?.reason || null,
    }))
  );

export const sortModelManifestRowsByName = (rows = []) => {
  return [...rows].sort((left, right) => {
    const leftName = (
      left.displayName ||
      left.mongoName ||
      left.name ||
      left.apiModelKey ||
      ""
    ).toString();
    const rightName = (
      right.displayName ||
      right.mongoName ||
      right.name ||
      right.apiModelKey ||
      ""
    ).toString();

    return leftName.localeCompare(rightName, "en", {
      sensitivity: "base",
      numeric: true,
    });
  });
};
