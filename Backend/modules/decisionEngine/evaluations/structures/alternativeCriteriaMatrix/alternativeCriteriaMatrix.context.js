export const buildCellKey = (alternativeName, criterionName) =>
  `${alternativeName}::${criterionName}`;

export const buildExpectedCellMetadata = ({ alternativeNames, criteria }) => {
  const expectedKeys = [];
  const expressionDomainByCellKey = new Map();

  for (const alternativeName of alternativeNames) {
    for (const criterion of criteria) {
      const criterionName = String(criterion?.name || "");
      const expressionDomain = criterion?.expressionDomain || null;
      const cellKey = buildCellKey(alternativeName, criterionName);
      expectedKeys.push(cellKey);
      expressionDomainByCellKey.set(cellKey, expressionDomain);
    }
  }

  return {
    expectedKeys,
    expressionDomainByCellKey,
  };
};

export const resolveAlternativesAndCriteria = async ({ structureContext }) => {
  const normalizedAlternatives = Array.isArray(structureContext?.alternatives)
    ? structureContext.alternatives
        .map((alternative) =>
          typeof alternative === "string"
            ? alternative
            : String(alternative?.name || "")
        )
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const normalizedCriteria = Array.isArray(structureContext?.leafCriteria)
    ? structureContext.leafCriteria
        .map((criterion) =>
          typeof criterion === "string"
            ? {
                name: criterion.trim(),
                expressionDomain: null,
              }
            : {
                name: String(criterion?.name || "").trim(),
                expressionDomain: criterion?.expressionDomain || null,
              }
        )
        .filter((criterion) => criterion.name)
    : [];

  return {
    alternativeNames: normalizedAlternatives,
    criteria: normalizedCriteria,
  };
};
