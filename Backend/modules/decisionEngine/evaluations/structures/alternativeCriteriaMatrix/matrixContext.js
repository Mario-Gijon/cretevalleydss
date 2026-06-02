import { getOrderedAlternativeAndCriterionNames } from "../shared/alternativeEvaluation.helpers.js";

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

export const resolveAlternativesAndCriteria = async ({
  issue,
  alternatives,
  criteria,
}) => {
  const normalizedAlternatives = Array.isArray(alternatives)
    ? alternatives
        .map((alternative) =>
          typeof alternative === "string"
            ? alternative
            : String(alternative?.name || "")
        )
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const normalizedCriteria = Array.isArray(criteria)
    ? criteria
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

  if (normalizedAlternatives.length > 0 && normalizedCriteria.length > 0) {
    return {
      alternativeNames: normalizedAlternatives,
      criteria: normalizedCriteria,
    };
  }

  const issueContext = await getOrderedAlternativeAndCriterionNames({ issue });

  return {
    alternativeNames: issueContext.alternativeNames,
    criteria: issueContext.criteria,
  };
};
