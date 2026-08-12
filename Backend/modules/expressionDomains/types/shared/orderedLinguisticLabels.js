import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isNonEmptyString } from "../../shared/validation.js";

export const normalizeLabelKeyFromText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const normalizeOrderedLinguisticLabelsOrThrow = (labels) => {
  const seenKeys = new Set();

  return labels.map((item, index) => {
    let label;
    let key;

    if (typeof item === "string") {
      label = item.trim();
      key = normalizeLabelKeyFromText(item);
    } else if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      label = typeof item.label === "string" ? item.label.trim() : "";
      key = isNonEmptyString(item.key)
        ? item.key.trim()
        : normalizeLabelKeyFromText(label);
    } else {
      throw createBadRequestError(
        "Each definition.labels item must be a string or an object.",
        { field: `definition.labels[${index}]` }
      );
    }

    if (!isNonEmptyString(label)) {
      throw createBadRequestError("Each label must be non-empty.", {
        field: `definition.labels[${index}].label`,
      });
    }

    if (!isNonEmptyString(key)) {
      throw createBadRequestError("Each label key must be non-empty.", {
        field: `definition.labels[${index}].key`,
      });
    }

    if (seenKeys.has(key)) {
      throw createBadRequestError("Label keys must be unique.", {
        field: `definition.labels[${index}].key`,
      });
    }
    seenKeys.add(key);

    return { key, label, index };
  });
};
