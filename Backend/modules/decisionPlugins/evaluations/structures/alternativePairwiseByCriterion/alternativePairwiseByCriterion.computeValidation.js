import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import { validateCellValueByDomainOrThrow } from "./alternativePairwiseByCriterion.payload.js";

const isNonEmptyValue = (value) =>
  !(value === "" || value === null || value === undefined);

export const validateCompletedPairwiseEvaluationPayloadsOrThrow = ({
  evaluations,
  criteria,
  expectedPairsByCriterion,
}) => {
  const criterionIds = criteria.map((criterion) => criterion.id);
  const criterionNameById = new Map(
    criteria.map((criterion) => [criterion.id, criterion.name])
  );

  for (const evaluation of evaluations) {
    const comparisonsByCriterion = evaluation?.payload;

    if (!isPlainObject(comparisonsByCriterion)) {
      throw createBadRequestError(
        "Completed pairwise evaluation payload is required",
        {
          field: "payload",
        }
      );
    }

    const unknownCriteriaKeys = Object.keys(comparisonsByCriterion).filter(
      (criterionId) => !criterionIds.includes(criterionId)
    );

    if (unknownCriteriaKeys.length > 0) {
      throw createBadRequestError(
        "Completed pairwise evaluation contains unknown criterion keys",
        {
          field: "payload",
          details: {
            unknownCriteriaKeys,
          },
        }
      );
    }

    for (const criterionId of criterionIds) {
      const criterionComparisons = comparisonsByCriterion[criterionId];
      if (!isPlainObject(criterionComparisons)) {
        throw createBadRequestError(
          `Completed pairwise evaluation is missing criterion '${criterionNameById.get(criterionId) || criterionId}' comparisons`,
          {
            field: "payload",
          }
        );
      }

      const expectedPairs = expectedPairsByCriterion[criterionId]?.pairs || [];
      const expectedPairSet = new Set(expectedPairs);
      const expectedAlternativeIds = new Set();

      expectedPairs.forEach((pairKey) => {
        const [rowAlternativeId] = String(pairKey).split("::");
        expectedAlternativeIds.add(rowAlternativeId);
      });

      const unknownRowKeys = Object.keys(criterionComparisons).filter(
        (alternativeId) => !expectedAlternativeIds.has(alternativeId)
      );

      if (unknownRowKeys.length > 0) {
        throw createBadRequestError(
          `Completed pairwise evaluation contains unknown rows for criterion '${criterionNameById.get(criterionId) || criterionId}'`,
          {
            field: "payload",
            details: {
              criterionId,
              unknownRowKeys,
            },
          }
        );
      }

      for (const pairKey of expectedPairs) {
        const [rowAlternativeId, colAlternativeId] = String(pairKey).split("::");
        const row = criterionComparisons[rowAlternativeId];
        const cell = isPlainObject(row) ? row[colAlternativeId] : undefined;
        if (!isPlainObject(cell) || !isNonEmptyValue(cell.value)) {
          throw createBadRequestError(
            "Completed pairwise evaluation is missing required comparison values",
            {
              field: "payload",
              details: {
                criterionId,
                pairKey,
              },
            }
          );
        }

        validateCellValueByDomainOrThrow({
          value: cell.value,
          expressionDomain:
            expectedPairsByCriterion[criterionId]?.expressionDomain || null,
          field: "payload",
        });
      }
    }
  }
};
