export const asArray = (value) => (Array.isArray(value) ? value : []);

export const count = (value) => asArray(value).length;

export const formatBoolean = (value, trueText = "Yes", falseText = "No") => {
  if (value === true) return trueText;
  if (value === false) return falseText;
  return "Unknown";
};

export const toTitle = (value) => {
  const text = String(value || "").replace(/[_-]+/g, " ").trim();
  if (!text) return "Unknown";

  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const valueToText = (value) => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value || "empty";
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const getModelDisplayName = (row = {}) =>
  row.displayName || row.mongoName || row.apiModelKey || "Unknown model";

export const isVisibleInCreate = (row = {}) => row.publicInIssueCatalog !== false;

export const getCatalogVisibilityLabel = (row = {}) =>
  isVisibleInCreate(row) ? "Active" : "Inactive";
