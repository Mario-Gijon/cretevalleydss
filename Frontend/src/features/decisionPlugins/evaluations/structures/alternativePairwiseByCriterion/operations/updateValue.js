import { reflectExpressionDomainValue } from "../../../../../expressionDomains";
import { isPlainObject } from "../../../../../../utils/common/objects";
import {
  hasAtMostDecimalPlaces,
  PAIRWISE_MAX_DECIMAL_PLACES,
  roundToDecimalPlaces,
} from "./numericPrecision";

export const updateValue = ({
  evaluation,
  alternatives,
  criterionId,
  rowAlternativeId,
  columnAlternativeId,
  nextValue,
  expressionDomain,
}) => {
  if (!isPlainObject(evaluation)) {
    throw new Error("Pairwise evaluation payload state is invalid.");
  }

  const rowIndex = alternatives.findIndex(
    (alternative) => alternative.id === rowAlternativeId
  );
  const columnIndex = alternatives.findIndex(
    (alternative) => alternative.id === columnAlternativeId
  );

  if (rowIndex < 0 || columnIndex < 0) {
    throw new Error("Pairwise update references an unknown alternative.");
  }

  if (rowIndex === columnIndex) {
    throw new Error("Pairwise updates cannot target diagonal values.");
  }

  const criterionEvaluation = evaluation[criterionId];

  if (
    !isPlainObject(criterionEvaluation) ||
    !isPlainObject(criterionEvaluation[rowAlternativeId]) ||
    !isPlainObject(criterionEvaluation[columnAlternativeId])
  ) {
    throw new Error("Pairwise criterion payload state is invalid.");
  }

  const nextEvaluation = structuredClone(evaluation);

  if (nextValue === "") {
    nextEvaluation[criterionId][rowAlternativeId][columnAlternativeId] = "";
    nextEvaluation[criterionId][columnAlternativeId][rowAlternativeId] = "";
    return nextEvaluation;
  }

  const isNumericContinuous = expressionDomain?.typeKey === "numericContinuous";

  if (
    isNumericContinuous &&
    !hasAtMostDecimalPlaces({
      value: nextValue,
      maxDecimalPlaces: PAIRWISE_MAX_DECIMAL_PLACES,
    })
  ) {
    throw new Error(
      `Pairwise numeric values may use at most ${PAIRWISE_MAX_DECIMAL_PLACES} decimal places.`
    );
  }

  const reflectedValue = reflectExpressionDomainValue({
    value: nextValue,
    expressionDomain,
  });
  const normalizedReflectedValue = isNumericContinuous
    ? roundToDecimalPlaces({
        value: reflectedValue,
        decimalPlaces: PAIRWISE_MAX_DECIMAL_PLACES,
      })
    : reflectedValue;

  nextEvaluation[criterionId][rowAlternativeId][columnAlternativeId] =
    nextValue;
  nextEvaluation[criterionId][columnAlternativeId][rowAlternativeId] =
    normalizedReflectedValue;

  return nextEvaluation;
};
