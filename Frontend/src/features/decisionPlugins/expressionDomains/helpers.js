export const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

export const normalizeDraftName = (value) =>
  typeof value === "string" ? value : "";

export const normalizeDraftNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
};

export const toSafeKey = (value, fallback = "label") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
};

export const buildUniqueLabelKey = ({
  label,
  index,
  usedKeys = new Set(),
  fallbackPrefix = "label",
}) => {
  const baseKey = toSafeKey(label, `${fallbackPrefix}_${index + 1}`);
  let candidate = baseKey;
  let suffix = 2;

  while (usedKeys.has(candidate)) {
    candidate = `${baseKey}_${suffix}`;
    suffix += 1;
  }

  usedKeys.add(candidate);
  return candidate;
};

export const normalizeLabelKeyValue = (value) => {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && typeof value.labelKey === "string") {
    return value.labelKey;
  }

  return "";
};

export const normalizeLabelsForDraft = ({
  labels = [],
  fallbackPrefix = "label",
}) => {
  const usedKeys = new Set();

  return (Array.isArray(labels) ? labels : []).map((labelItem, index) => {
    const label = String(labelItem?.label || "").trim();
    const key = buildUniqueLabelKey({
      label,
      index,
      usedKeys,
      fallbackPrefix,
    });

    return {
      key,
      label: label || `Label ${index + 1}`,
      index,
    };
  });
};

