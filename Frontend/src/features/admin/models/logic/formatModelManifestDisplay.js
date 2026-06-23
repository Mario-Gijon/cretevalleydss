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

export const getModelVisibilityFieldForKind = (row = {}) =>
  row?.modelKind === "criteriaWeighting"
    ? "visibleInCriteriaWeighting"
    : "visibleInIssueCreation";

export const isModelActiveInCatalog = (row = {}) =>
  getModelVisibilityFieldForKind(row) === "visibleInCriteriaWeighting"
    ? row.visibleInCriteriaWeighting !== false
    : row.visibleInIssueCreation !== false;

export const getModelVisibilityTooltip = (row = {}, checked = false) => {
  if (row?.protectedHistoricalModel === true) {
    return "This model cannot be activated for new issues";
  }

  if (row?.modelKind === "criteriaWeighting") {
    return checked
      ? "Visible in criteria weighting selection"
      : "Hidden from criteria weighting selection";
  }

  return checked
    ? "Visible in issue model selection"
    : "Hidden from issue model selection";
};

export const getModelCatalogVisibilityLabel = (row = {}) =>
  isModelActiveInCatalog(row) ? "Active" : "Inactive";

export const getModelAdminEnabledLabel = (row = {}) =>
  isModelActiveInCatalog(row) ? "Enabled" : "Disabled";
