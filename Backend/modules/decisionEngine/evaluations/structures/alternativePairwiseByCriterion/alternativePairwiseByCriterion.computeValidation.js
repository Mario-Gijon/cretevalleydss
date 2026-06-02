import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import { validateCellValueByDomainOrThrow } from "./alternativePairwiseByCriterion.payload.js";

const isNonEmptyValue = (value) =>
  !(value === "" || value === null || value === undefined);

export const validateCompletedPairwiseEvaluationPayloadsOrThrow = ({
  evaluations,
  criterionNames,
  expectedPairsByCriterion,
}) => {
  for (const evaluation of evaluations) {
    const comparisonsByCriterion = evaluation?.payload?.comparisonsByCriterion;

    if (!isPlainObject(comparisonsByCriterion)) {
      throw createBadRequestError(
        "Completed pairwise evaluation payload.comparisonsByCriterion is required",
        {
          field: "payload.comparisonsByCriterion",
        }
      );
    }

    const unknownCriteriaKeys = Object.keys(comparisonsByCriterion).filter(
      (criterionName) => !criterionNames.includes(criterionName)
    );

    if (unknownCriteriaKeys.length > 0) {
      throw createBadRequestError(
        "Completed pairwise evaluation contains unknown criterion keys",
        {
          field: "payload.comparisonsByCriterion",
          details: {
            unknownCriteriaKeys,
          },
        }
      );
    }

    for (const criterionName of criterionNames) {
      const criterionComparisons = comparisonsByCriterion[criterionName];
      if (!isPlainObject(criterionComparisons)) {
        throw createBadRequestError(
          `Completed pairwise evaluation is missing criterion '${criterionName}' comparisons`,
          {
            field: "payload.comparisonsByCriterion",
          }
        );
      }

      const expectedPairs = expectedPairsByCriterion[criterionName]?.pairs || [];
      const expectedPairSet = new Set(expectedPairs);

      const unknownPairKeys = Object.keys(criterionComparisons).filter(
        (pairKey) => !expectedPairSet.has(pairKey)
      );

      if (unknownPairKeys.length > 0) {
        throw createBadRequestError(
          `Completed pairwise evaluation contains unknown pairs for criterion '${criterionName}'`,
          {
            field: "payload.comparisonsByCriterion",
            details: {
              criterionName,
              unknownPairKeys,
            },
          }
        );
      }

      for (const pairKey of expectedPairs) {
        const cell = criterionComparisons[pairKey];
        if (!isPlainObject(cell) || !isNonEmptyValue(cell.value)) {
          throw createBadRequestError(
            "Completed pairwise evaluation is missing required comparison values",
            {
              field: "payload.comparisonsByCriterion",
              details: {
                criterionName,
                pairKey,
              },
            }
          );
        }

        validateCellValueByDomainOrThrow({
          value: cell.value,
          expressionDomain:
            expectedPairsByCriterion[criterionName]?.expressionDomain || null,
          field: "payload.comparisonsByCriterion",
        });
      }
    }
  }
};
