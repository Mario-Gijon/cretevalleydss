export const formatAdminIssueWeightValue = (value) => {
  if (value == null || value === "") return "—";

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);

  const raw = String(num);

  if (raw.includes("e") || raw.includes("E")) {
    const fixed = num.toFixed(6).replace(/\.?0+$/, "");
    const [intPart, decPart = ""] = fixed.split(".");
    if (!decPart) return intPart;
    if (decPart.length <= 2) return fixed;
    return `${intPart}.${decPart.slice(0, 2)}...`;
  }

  const [intPart, decPart = ""] = raw.split(".");
  if (!decPart) return intPart;
  if (decPart.length <= 2) return raw;

  return `${intPart}.${decPart.slice(0, 2)}...`;
};

export const formatAdminIssueDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};
