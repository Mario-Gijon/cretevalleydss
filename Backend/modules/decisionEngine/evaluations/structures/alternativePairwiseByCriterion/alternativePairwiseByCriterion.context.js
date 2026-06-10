import { createInternalError } from "../../../../../utils/common/errors.js";

export const buildComparisonKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

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

export const buildExpectedPairsByCriterion = ({ criteria, alternativeNames }) => {
  const expectedPairsByCriterion = {};

  for (const criterion of criteria) {
    const criterionName = criterion.name;
    expectedPairsByCriterion[criterionName] = {
      pairs: [],
      expressionDomain: criterion.expressionDomain,
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
  const normalizedAlternatives =
    requireStructureAlternativeNamesOrThrow(structureContext);
  const normalizedCriteria = requireStructureCriteriaOrThrow(structureContext);

  return {
    alternativeNames: normalizedAlternatives,
    criteria: normalizedCriteria,
    criterionNames: normalizedCriteria.map((criterion) => criterion.name),
  };
};
