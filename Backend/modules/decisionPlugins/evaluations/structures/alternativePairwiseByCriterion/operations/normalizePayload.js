import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { validateExpressionDomainEvaluationOrThrow } from "../../../../../expressionDomains/validateExpressionDomainEvaluation.js";
import {
  areExpressionDomainValuesEqual,
  reflectExpressionDomainValue,
} from "../../../../../expressionDomains/index.js";
import { resolveItems } from "./resolveItems.js";
import { validatePayloadShape } from "./validatePayloadShape.js";

const isEmptyValue = (value) => value === "";

const requireDefinedValue = ({ value, field }) => {
  if (value === undefined || value === null) {
    throw createBadRequestError("Pairwise value is invalid.", {
      field,
    });
  }

  return value;
};

export const normalizePayload = async ({
  payload,
  decisionContext,
  requireValue,
}) => {
  const { alternatives, criteria, criterionIds } = await resolveItems({
    decisionContext,
  });

  validatePayloadShape({
    payload,
    alternatives,
    criterionIds,
  });

  const normalizedPayload = {};

  for (const criterion of criteria) {
    const criterionPayload = payload[criterion.id];
    const normalizedMatrix = {};

    for (const alternative of alternatives) {
      normalizedMatrix[alternative.id] = {};
    }

    for (
      let rowIndex = 0;
      rowIndex < alternatives.length;
      rowIndex += 1
    ) {
      const rowAlternativeId = alternatives[rowIndex].id;

      for (
        let columnIndex = rowIndex + 1;
        columnIndex < alternatives.length;
        columnIndex += 1
      ) {
        const columnAlternativeId = alternatives[columnIndex].id;
        const upperField =
          `payload.${criterion.id}.${rowAlternativeId}.${columnAlternativeId}`;
        const lowerField =
          `payload.${criterion.id}.${columnAlternativeId}.${rowAlternativeId}`;
        const upperValue = requireDefinedValue({
          value:
            criterionPayload[rowAlternativeId][columnAlternativeId],
          field: upperField,
        });
        const lowerValue = requireDefinedValue({
          value:
            criterionPayload[columnAlternativeId][rowAlternativeId],
          field: lowerField,
        });
        const upperEmpty = isEmptyValue(upperValue);
        const lowerEmpty = isEmptyValue(lowerValue);

        if (upperEmpty !== lowerEmpty) {
          throw createBadRequestError(
            "Draft pairwise comparisons must leave both directions empty or both filled.",
            {
              field: upperEmpty ? upperField : lowerField,
            }
          );
        }

        if (upperEmpty) {
          if (requireValue) {
            throw createBadRequestError(
              "All pairwise comparisons must include a value for submit.",
              {
                field: upperField,
              }
            );
          }

          normalizedMatrix[rowAlternativeId][columnAlternativeId] = "";
          normalizedMatrix[columnAlternativeId][rowAlternativeId] = "";
          continue;
        }

        const normalizedUpperValue =
          validateExpressionDomainEvaluationOrThrow({
            value: upperValue,
            expressionDomain: criterion.expressionDomain,
          });
        const expectedLowerValue = reflectExpressionDomainValue({
          value: normalizedUpperValue,
          expressionDomain: criterion.expressionDomain,
        });

        if (
          !areExpressionDomainValuesEqual({
            left: lowerValue,
            right: expectedLowerValue,
            expressionDomain: criterion.expressionDomain,
          })
        ) {
          throw createBadRequestError(
            "The lower pairwise value must equal the reflected inverse of its upper value.",
            {
              code: "PAIRWISE_REFLECTION_MISMATCH",
              field: lowerField,
            }
          );
        }

        normalizedMatrix[rowAlternativeId][columnAlternativeId] =
          normalizedUpperValue;
        normalizedMatrix[columnAlternativeId][rowAlternativeId] =
          expectedLowerValue;
      }
    }

    normalizedPayload[criterion.id] = normalizedMatrix;
  }

  return normalizedPayload;
};
