import {
  assertPairwiseReflectionCompatible,
  reflectExpressionDomainValue,
  validateExpressionDomainEvaluation,
} from "../../../../../expressionDomains";
import { isPlainObject } from "../../../../../../utils/common/objects";

const valuesEqual = (left, right) => {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    typeof left === "number" &&
    Number.isFinite(left) &&
    typeof right === "number" &&
    Number.isFinite(right)
  ) {
    return Math.abs(left - right) <= 1e-9;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => Object.hasOwn(right, key) && valuesEqual(left[key], right[key])
      )
    );
  }

  return false;
};

export const validateEvaluation = ({
  alternatives,
  criteria,
  evaluation,
}) => {
  if (!isPlainObject(evaluation)) {
    throw new Error("Pairwise evaluation payload must be an object.");
  }

  const alternativeIds = alternatives.map((alternative) => alternative.id);
  const criterionIds = criteria.map((criterion) => criterion.id);
  const unknownCriterionIds = Object.keys(evaluation).filter(
    (criterionId) => !criterionIds.includes(criterionId)
  );

  if (unknownCriterionIds.length > 0) {
    throw new Error("Pairwise evaluation contains unknown criteria.");
  }

  for (const criterion of criteria) {
    if (!Object.hasOwn(evaluation, criterion.id)) {
      throw new Error(`Pairwise evaluation is missing criterion "${criterion.id}".`);
    }

    assertPairwiseReflectionCompatible(criterion.expressionDomain);
    const matrix = evaluation[criterion.id];

    if (!isPlainObject(matrix)) {
      throw new Error(`Pairwise criterion "${criterion.id}" must be an object.`);
    }

    const unknownRowIds = Object.keys(matrix).filter(
      (rowAlternativeId) => !alternativeIds.includes(rowAlternativeId)
    );

    if (unknownRowIds.length > 0) {
      throw new Error("Pairwise evaluation contains unknown rows.");
    }

    for (const rowAlternativeId of alternativeIds) {
      if (!Object.hasOwn(matrix, rowAlternativeId)) {
        throw new Error(
          `Pairwise evaluation is missing row "${rowAlternativeId}".`
        );
      }

      const row = matrix[rowAlternativeId];

      if (!isPlainObject(row)) {
        throw new Error(`Pairwise row "${rowAlternativeId}" must be an object.`);
      }

      const columnIds = Object.keys(row);

      if (columnIds.includes(rowAlternativeId)) {
        throw new Error(
          `Pairwise row "${rowAlternativeId}" must not contain a diagonal value.`
        );
      }

      const unknownColumnIds = columnIds.filter(
        (columnAlternativeId) => !alternativeIds.includes(columnAlternativeId)
      );

      if (unknownColumnIds.length > 0) {
        throw new Error(
          `Pairwise row "${rowAlternativeId}" contains unknown columns.`
        );
      }

      for (const columnAlternativeId of alternativeIds) {
        if (
          columnAlternativeId !== rowAlternativeId &&
          !Object.hasOwn(row, columnAlternativeId)
        ) {
          throw new Error(
            `Pairwise row "${rowAlternativeId}" is missing column "${columnAlternativeId}".`
          );
        }
      }
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
        const upperValue = matrix[rowAlternativeId][columnAlternativeId];
        const lowerValue = matrix[columnAlternativeId][rowAlternativeId];
        const upperEmpty = upperValue === "";
        const lowerEmpty = lowerValue === "";

        if (upperEmpty !== lowerEmpty) {
          throw new Error(
            "Pairwise draft values must be empty in both directions."
          );
        }

        if (upperEmpty) {
          continue;
        }

        const normalizedUpperValue = validateExpressionDomainEvaluation({
          value: upperValue,
          expressionDomain: criterion.expressionDomain,
        });
        const reflectedValue = reflectExpressionDomainValue({
          value: normalizedUpperValue,
          expressionDomain: criterion.expressionDomain,
        });

        if (!valuesEqual(lowerValue, reflectedValue)) {
          throw new Error(
            "Pairwise lower value must match the reflected upper value."
          );
        }
      }
    }
  }

  return evaluation;
};
