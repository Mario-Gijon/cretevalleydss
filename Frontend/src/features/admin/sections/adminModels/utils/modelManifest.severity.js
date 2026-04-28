import { count } from "./modelManifest.formatters";

export const getSeverityForStatus = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "available") return "success";
  if (normalized === "pendingintegration" || normalized === "experimental") {
    return "warning";
  }
  if (normalized === "deprecated" || normalized === "stale" || normalized === "unavailable") {
    return "error";
  }
  return "info";
};

export const getSeverityForSyncState = (syncState) => {
  const normalized = String(syncState || "").toLowerCase();
  if (normalized === "synced") return "success";
  if (normalized === "available") return "success";
  if (normalized === "not syncable") return "info";
  if (normalized === "pending integration") return "warning";
  if (normalized === "missing in mongo" || normalized === "missing in manifest") {
    return "warning";
  }
  if (
    normalized === "has differences" ||
    normalized === "stale" ||
    normalized === "unavailable"
  ) {
    return "warning";
  }
  return "info";
};

export const getSeverityForRole = (role) => {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "issuemodel") return "success";
  if (normalized === "weightingservice") return "info";
  if (normalized === "utilitymodel") return "warning";
  return "info";
};

export const getSyncState = (row = {}) => {
  if (row.syncState) return row.syncState;
  if (count(row.differences) > 0) return "Has differences";
  if (row.matched) return "Synced";
  if (row.reason) return "Review needed";
  return "Unknown";
};
