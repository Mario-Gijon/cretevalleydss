let fallbackCounter = 0;

const buildAlternativeId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  fallbackCounter += 1;
  return `alternative_${fallbackCounter}`;
};

export const normalizeCreateIssueAlternatives = (alternatives) =>
  (Array.isArray(alternatives) ? alternatives : []).flatMap((alternative) => {
    if (typeof alternative === "string") {
      const name = alternative.trim();
      return name ? [{ id: buildAlternativeId(), name, description: "" }] : [];
    }
    if (!alternative || typeof alternative !== "object" || Array.isArray(alternative)) {
      return [];
    }
    const name = typeof alternative.name === "string" ? alternative.name : "";
    if (!name.trim()) return [];
    const id = typeof alternative.id === "string" && alternative.id.trim()
      ? alternative.id
      : buildAlternativeId();
    return [{
      id,
      name,
      description: typeof alternative.description === "string" ? alternative.description : "",
    }];
  });

export const buildCreateIssueAlternativeId = buildAlternativeId;
