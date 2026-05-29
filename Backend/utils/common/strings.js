export const normalizeString = (
  value,
  {
    trim = true,
    collapseWhitespace = true,
    lower = false,
  } = {}
) => {
  let result = value == null ? "" : String(value);

  if (trim) result = result.trim();
  if (collapseWhitespace) result = result.replace(/\s+/g, " ");
  if (lower) result = result.toLowerCase();

  return result;
};

export const normalizeOptionalString = (value, options = {}) => {
  const normalized = normalizeString(value, options);
  return normalized || null;
};

export const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeEmail = (value) =>
  normalizeString(value, {
    trim: true,
    collapseWhitespace: true,
    lower: true,
  });

export const removeAccents = (value) =>
  normalizeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const includesNormalized = (text, query) => {
  const normalizedText = removeAccents(text).toLowerCase();
  const normalizedQuery = removeAccents(query).toLowerCase();

  return normalizedText.includes(normalizedQuery);
};

export const isNonEmptyString = (value) => normalizeString(value).length > 0;

export const getUniqueTrimmedStrings = (values = []) => {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeString(value))
        .filter(Boolean)
    ),
  ];
};
