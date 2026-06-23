export const formatModelManifestBoolean = (
  value,
  trueText = "Yes",
  falseText = "No"
) => {
  if (value === true) return trueText;
  if (value === false) return falseText;
  return "Unknown";
};

export const toModelManifestTitle = (value) => {
  const text = String(value || "").replace(/[_-]+/g, " ").trim();
  if (!text) return "Unknown";

  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const modelManifestValueToText = (value) => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value || "empty";
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const getModelManifestDisplayName = (row = {}) =>
  row.displayName || row.mongoName || row.apiModelKey || "Unknown model";

export const isModelVisibleInCreateIssue = (row = {}) =>
  row.visibleInIssueCreation !== false;

export const getModelCatalogVisibilityLabel = (row = {}) =>
  isModelVisibleInCreateIssue(row) ? "Active" : "Inactive";

export const getModelAdminEnabledLabel = (row = {}) =>
  isModelVisibleInCreateIssue(row) ? "Enabled" : "Disabled";
