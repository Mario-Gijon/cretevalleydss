import { createInternalError } from "../../../../../utils/common/errors.js";

export const buildCellKey = (alternativeName, criterionName) =>
  `${alternativeName}::${criterionName}`;

const requireStructureContextOrThrow = (structureContext) => {
  if (
    !structureContext ||
    typeof structureContext !== "object" ||
    Array.isArray(structureContext)
  ) {
    throw createInternalError("Evaluation structure context is invalid", {
      field: "structureContext",
    });
  }

  return structureContext;
};

const requireStructureAlternativeNamesOrThrow = (structureContext) => {
  const { alternatives } = requireStructureContextOrThrow(structureContext);

  if (!Array.isArray(alternatives)) {
    throw createInternalError(
      "Evaluation structure context alternatives must be an array",
      {
        field: "structureContext.alternatives",
      }
    );
  }

  return alternatives.map((alternative, index) => {
    if (
      !alternative ||
      typeof alternative !== "object" ||
      Array.isArray(alternative) ||
      typeof alternative.name !== "string" ||
      alternative.name.trim() === ""
    ) {
      throw createInternalError("Evaluation structure alternative is invalid", {
        field: `structureContext.alternatives[${index}]`,
      });
    }

    return alternative.name.trim();
  });
};

const requireStructureCriteriaOrThrow = (structureContext) => {
  const { leafCriteria } = requireStructureContextOrThrow(structureContext);

  if (!Array.isArray(leafCriteria)) {
    throw createInternalError(
      "Evaluation structure context leafCriteria must be an array",
      {
        field: "structureContext.leafCriteria",
      }
    );
  }

  return leafCriteria.map((criterion, index) => {
    if (
      !criterion ||
      typeof criterion !== "object" ||
      Array.isArray(criterion) ||
      typeof criterion.name !== "string" ||
      criterion.name.trim() === ""
    ) {
      throw createInternalError("Evaluation structure criterion is invalid", {
        field: `structureContext.leafCriteria[${index}]`,
      });
    }

    return {
      name: criterion.name.trim(),
      expressionDomain: criterion.expressionDomain,
    };
  });
};

export const buildExpectedCellMetadata = ({ alternativeNames, criteria }) => {
  const expectedKeys = [];
  const expressionDomainByCellKey = new Map();

  for (const alternativeName of alternativeNames) {
    for (const criterion of criteria) {
      const criterionName = criterion.name;
      const expressionDomain = criterion.expressionDomain;
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
  const normalizedAlternatives =
    requireStructureAlternativeNamesOrThrow(structureContext);
  const normalizedCriteria = requireStructureCriteriaOrThrow(structureContext);

  return {
    alternativeNames: normalizedAlternatives,
    criteria: normalizedCriteria,
  };
};
