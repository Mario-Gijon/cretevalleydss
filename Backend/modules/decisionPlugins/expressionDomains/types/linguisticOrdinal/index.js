import { createBadRequestError } from "../../../../../utils/common/errors.js";

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const normalizeNameOrThrow = (value) => {
  if (!isNonEmptyString(value)) {
    throw createBadRequestError("Expression domain name is required.", {
      field: "name",
    });
  }

  return value.trim();
};

const normalizeLabelKeyFromText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeOrdinalLabelsOrThrow = (labels) => {
  if (!Array.isArray(labels) || labels.length < 2) {
    throw createBadRequestError(
      "definition.labels must contain at least two labels.",
      { field: "definition.labels" }
    );
  }

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

    return {
      key,
      label,
      index,
    };
  });
};

const normalizeEvaluationLabelKeyOrThrow = ({ value, labels }) => {
  let labelKey = null;

  if (typeof value === "string") {
    labelKey = value.trim();
  } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    labelKey = typeof value.labelKey === "string" ? value.labelKey.trim() : "";
  }

  if (!isNonEmptyString(labelKey)) {
    throw createBadRequestError("Value is required.", {
      field: "value",
    });
  }

  if (!labels.some((item) => item.key === labelKey)) {
    throw createBadRequestError("Value must match one of the configured labels.", {
      field: "value",
    });
  }

  return { labelKey };
};

export const linguisticOrdinal = Object.freeze({
  key: "linguisticOrdinal",
  label: "Linguistic Ordinal",
  description: "Ordered linguistic labels represented by discrete label keys.",
  family: "linguistic",

  validateCreation(payload = {}) {
    const name = normalizeNameOrThrow(payload?.name);
    const definition = payload?.definition;

    if (definition === null || typeof definition !== "object" || Array.isArray(definition)) {
      throw createBadRequestError("definition must be an object.", {
        field: "definition",
      });
    }

    const labels = normalizeOrdinalLabelsOrThrow(definition.labels);

    return {
      name,
      typeKey: "linguisticOrdinal",
      family: "linguistic",
      definition: {
        labelCount: labels.length,
        labels,
      },
    };
  },

  validateEvaluation({ value, expressionDomain } = {}) {
    const labels = Array.isArray(expressionDomain?.definition?.labels)
      ? expressionDomain.definition.labels
      : null;

    if (!labels) {
      throw createBadRequestError("Expression domain definition is invalid.", {
        field: "definition",
      });
    }

    return normalizeEvaluationLabelKeyOrThrow({
      value,
      labels,
    });
  },
});
