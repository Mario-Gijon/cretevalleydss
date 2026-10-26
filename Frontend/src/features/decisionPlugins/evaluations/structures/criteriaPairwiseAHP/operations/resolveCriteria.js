
const normalizeCriteria = (source, field) => {
  if (!Array.isArray(source)) {
    throw new Error(`AHP ${field} must be an array.`);
  }
  const ids = new Set();
  return source.map((criterion, index) => {
    const id = typeof criterion?.id === "string" ? criterion.id.trim() : "";
    const name = typeof criterion?.name === "string" ? criterion.name.trim() : "";
    if (!id || !name || ids.has(id)) {
      throw new Error(`AHP criterion at ${field}[${index}] is invalid or duplicated.`);
    }
    ids.add(id);
    return { id, name, index };
  });
};

export const resolveCriteria = ({ decisionContext }) => {
  if (!decisionContext || typeof decisionContext !== "object" || Array.isArray(decisionContext)) {
    throw new Error("AHP decision context must be an object.");
  }
  if (Array.isArray(decisionContext.criteriaWeightingCriteria)) {
    return normalizeCriteria(
      decisionContext.criteriaWeightingCriteria,
      "criteriaWeightingCriteria"
    );
  }
  return normalizeCriteria(decisionContext.leafCriteria, "leafCriteria");
};
