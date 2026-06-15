export const formatCollectiveDisplayValue = (value) => {
  if (Array.isArray(value)) {
    return `[${value.join(", ")}]`;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(Object.is(numeric, -0) ? 0 : numeric);
};
