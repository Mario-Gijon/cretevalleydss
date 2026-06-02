export const buildComparisonKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

export const buildExpectedPairsByCriterion = ({ criteria, alternativeNames }) => {
  const expectedPairsByCriterion = {};

  for (const criterion of criteria) {
    const criterionName = String(criterion?.name || "");
    expectedPairsByCriterion[criterionName] = {
      pairs: [],
      expressionDomain: criterion?.expressionDomain || null,
    };

    for (const alternativeA of alternativeNames) {
      for (const alternativeB of alternativeNames) {
        if (alternativeA === alternativeB) {
          continue;
        }

        expectedPairsByCriterion[criterionName].pairs.push(
          buildComparisonKey(alternativeA, alternativeB)
        );
      }
    }
  }

  return expectedPairsByCriterion;
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
    criterionNames: normalizedCriteria.map((criterion) => criterion.name),
  };
};
