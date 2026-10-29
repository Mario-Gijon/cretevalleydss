import {
  createBadRequestError,
  createConflictError,
} from "../../utils/common/errors.js";

export const normalizeApiModelKeys = (apiModelKeys) => {
  if (apiModelKeys === undefined) {
    return null;
  }

  if (!Array.isArray(apiModelKeys) || apiModelKeys.length === 0) {
    throw createBadRequestError(
      "Scoped manifest operations require a non-empty apiModelKeys array",
      { field: "apiModelKeys" }
    );
  }

  const normalizedKeys = apiModelKeys.map((key) =>
    typeof key === "string" ? key.trim() : ""
  );

  if (normalizedKeys.some((key) => !key)) {
    throw createBadRequestError(
      "apiModelKeys must contain non-empty strings",
      { field: "apiModelKeys" }
    );
  }

  if (new Set(normalizedKeys).size !== normalizedKeys.length) {
    throw createBadRequestError("apiModelKeys must not contain duplicates", {
      field: "apiModelKeys",
    });
  }

  return normalizedKeys;
};

export const selectScopedManifestModels = (manifestModels, apiModelKeys) => {
  if (apiModelKeys === null) {
    return manifestModels;
  }

  return apiModelKeys.map((apiModelKey) => {
    const matches = manifestModels.filter(
      (model) => String(model?.apiModelKey || "").trim() === apiModelKey
    );

    if (matches.length !== 1) {
      throw createConflictError(
        matches.length === 0
          ? `Manifest model ${apiModelKey} was not found`
          : `Manifest contains multiple entries for ${apiModelKey}`,
        {
          field: "apiModelKeys",
          details: { apiModelKey, manifestMatches: matches.length },
        }
      );
    }

    return matches[0];
  });
};
