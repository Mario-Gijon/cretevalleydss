const countEntries = (value) => (Array.isArray(value) ? value.length : 0);

export const getModelManifestSyncSeverity = (syncState) => {
  const normalized = String(syncState || "").toLowerCase();

  if (normalized === "synced") return "success";
  if (normalized === "available") return "success";
  if (normalized === "not syncable") return "info";
  if (normalized === "pending integration") return "warning";
  if (
    normalized === "missing in mongo" ||
    normalized === "missing from manifest" ||
    normalized === "will be deleted" ||
    normalized === "protected historical model"
  ) {
    return "warning";
  }
  if (normalized === "has differences" || normalized === "unavailable") {
    return "warning";
  }

  return "info";
};

export const getModelManifestSyncState = (row = {}) => {
  if (row.syncState) return row.syncState;
  if (countEntries(row.differences) > 0) return "Has differences";
  if (row.matched) return "Synced";
  if (row.reason) return "Review needed";
  return "Unknown";
};
