import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { hasOwnKey, isPlainObject } from "../../../../../utils/common/objects.js";
import { validateExpressionDomainEvaluationOrThrow } from "../../../../expressionDomains/validateExpressionDomainEvaluation.js";
import {
  areExpressionDomainValuesEqual,
  reflectExpressionDomainValue,
} from "../../../../expressionDomains/index.js";
import {
  buildExpectedPairsByCriterion,
  resolveAlternativesAndCriteria,
} from "./alternativePairwiseByCriterion.context.js";

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

export const buildEmptyCell = () => ({
  value: "",
});

export const resolveRequireValueFromModeOrThrow = (mode) => {
  if (mode === EVALUATION_SAVE_MODES.DRAFT) {
    return false;
  }

  if (mode === EVALUATION_SAVE_MODES.SUBMIT) {
    return true;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};

const isEmptyCellValue = (value) => value === "";

const rejectUnsupportedTopLevelShapesOrThrow = (payload) => {
  if (
    Object.prototype.hasOwnProperty.call(payload, "comparisonsByCriterion") ||
    Object.prototype.hasOwnProperty.call(payload, "evaluations") ||
    Object.prototype.hasOwnProperty.call(payload, "rows") ||
    Object.prototype.hasOwnProperty.call(payload, "matrix") ||
    Object.prototype.hasOwnProperty.call(payload, "direct") ||
    Object.prototype.hasOwnProperty.call(payload, "pairwiseAlternatives")
  ) {
    throw createBadRequestError("Unsupported alternative pairwise payload shape", {
      field: "payload",
    });
  }
};

const requireCanonicalCellOrThrow = ({ cell, field, requireValue }) => {
  if (!isPlainObject(cell)) {
    throw createBadRequestError("Pairwise cell must be an object.", { field });
  }

  const keys = Object.keys(cell);

  if (keys.length !== 1 || !hasOwnKey(cell, "value")) {
    throw createBadRequestError("Pairwise cell must contain exactly the key 'value'.", {
      field,
    });
  }

  if (cell.value === undefined || cell.value === null) {
    throw createBadRequestError("Pairwise cell value is invalid.", {
      field: `${field}.value`,
    });
  }

  if (requireValue && isEmptyCellValue(cell.value)) {
    throw createBadRequestError("All pairwise comparisons must include a value for submit.", {
      field: `${field}.value`,
    });
  }

  return cell;
};

const buildEmptyMatrixForCriterion = ({ alternatives }) =>
  Object.fromEntries(
    alternatives.map((rowAlternative) => [
      rowAlternative.id,
      Object.fromEntries(
        alternatives
          .filter((columnAlternative) => columnAlternative.id !== rowAlternative.id)
          .map((columnAlternative) => [columnAlternative.id, buildEmptyCell()])
      ),
    ])
  );

const requireCanonicalShapeOrThrow = ({
  payload,
  alternatives,
  criterionIds,
}) => {
  const topLevelKeys = Object.keys(payload);
  const unknownCriterionKeys = topLevelKeys.filter((criterionId) => !criterionIds.includes(criterionId));

  if (unknownCriterionKeys.length > 0) {
    throw createBadRequestError("payload contains unknown criterion keys", {
      field: "payload",
    });
  }

  for (const criterionId of criterionIds) {
    if (!hasOwnKey(payload, criterionId)) {
      throw createBadRequestError("payload is missing a criterion matrix.", {
        field: `payload.${criterionId}`,
      });
    }

    const criterionPayload = payload[criterionId];

    if (!isPlainObject(criterionPayload)) {
      throw createBadRequestError("Criterion matrix must be an object.", {
        field: `payload.${criterionId}`,
      });
    }

    const rowKeys = Object.keys(criterionPayload);
    const expectedRowKeys = alternatives.map((alternative) => alternative.id);
    const unknownRowKeys = rowKeys.filter((rowId) => !expectedRowKeys.includes(rowId));

    if (unknownRowKeys.length > 0) {
      throw createBadRequestError("Criterion matrix contains unknown row alternatives.", {
        field: `payload.${criterionId}`,
      });
    }

    for (const rowAlternative of alternatives) {
      if (!hasOwnKey(criterionPayload, rowAlternative.id)) {
        throw createBadRequestError("Criterion matrix is missing a row alternative.", {
          field: `payload.${criterionId}.${rowAlternative.id}`,
        });
      }

      const rowPayload = criterionPayload[rowAlternative.id];

      if (!isPlainObject(rowPayload)) {
        throw createBadRequestError("Pairwise row must be an object.", {
          field: `payload.${criterionId}.${rowAlternative.id}`,
        });
      }

      const columnKeys = Object.keys(rowPayload);
      const expectedColumnKeys = alternatives
        .filter((alternative) => alternative.id !== rowAlternative.id)
        .map((alternative) => alternative.id);
      const unknownColumnKeys = columnKeys.filter(
        (columnId) =>
          !expectedColumnKeys.includes(columnId) || columnId === rowAlternative.id
      );

      if (unknownColumnKeys.length > 0) {
        throw createBadRequestError(
          columnKeys.includes(rowAlternative.id)
            ? "Diagonal pairwise cells are not allowed."
            : "Pairwise row contains unknown column alternatives.",
          {
            field: `payload.${criterionId}.${rowAlternative.id}`,
          }
        );
      }

      for (const columnAlternative of alternatives) {
        if (columnAlternative.id === rowAlternative.id) {
          continue;
        }

        if (!hasOwnKey(rowPayload, columnAlternative.id)) {
          throw createBadRequestError("Pairwise row is missing a directed comparison.", {
            field: `payload.${criterionId}.${rowAlternative.id}.${columnAlternative.id}`,
          });
        }
      }
    }
  }
};

export const normalizePayloadOrThrow = async ({
  payload,
  decisionContext,
  requireValue,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  rejectUnsupportedTopLevelShapesOrThrow(payload);

  const { alternatives, criteria, criterionIds } = await resolveAlternativesAndCriteria({
    decisionContext,
  });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria,
    alternatives,
  });

  requireCanonicalShapeOrThrow({
    payload,
    alternatives,
    criterionIds,
  });

  const normalizedPayload = {};

  for (const criterionId of criterionIds) {
    const criterionMeta = expectedPairsByCriterion[criterionId];
    const criterionPayload = payload[criterionId];
    const canonicalMatrix = buildEmptyMatrixForCriterion({ alternatives });

    for (const pair of criterionMeta.editablePairs) {
      const upperField = `payload.${criterionId}.${pair.rowAlternativeId}.${pair.columnAlternativeId}`;
      const lowerField = `payload.${criterionId}.${pair.columnAlternativeId}.${pair.rowAlternativeId}`;
      const upperCell = requireCanonicalCellOrThrow({
        cell: criterionPayload[pair.rowAlternativeId][pair.columnAlternativeId],
        field: upperField,
        requireValue,
      });
      const lowerCell = requireCanonicalCellOrThrow({
        cell: criterionPayload[pair.columnAlternativeId][pair.rowAlternativeId],
        field: lowerField,
        requireValue,
      });
      const upperEmpty = isEmptyCellValue(upperCell.value);
      const lowerEmpty = isEmptyCellValue(lowerCell.value);

      if (upperEmpty || lowerEmpty) {
        if (upperEmpty !== lowerEmpty) {
          throw createBadRequestError(
            "Draft pairwise comparisons must leave both directions empty or both filled.",
            {
              field: upperEmpty ? `${upperField}.value` : `${lowerField}.value`,
            }
          );
        }

        canonicalMatrix[pair.rowAlternativeId][pair.columnAlternativeId] = buildEmptyCell();
        canonicalMatrix[pair.columnAlternativeId][pair.rowAlternativeId] = buildEmptyCell();
        continue;
      }

      const normalizedUpperValue = validateExpressionDomainEvaluationOrThrow({
        value: upperCell.value,
        expressionDomain: criterionMeta.expressionDomain,
      });
      const expectedLowerValue = reflectExpressionDomainValue({
        value: normalizedUpperValue,
        expressionDomain: criterionMeta.expressionDomain,
      });

      if (
        !areExpressionDomainValuesEqual({
          left: lowerCell.value,
          right: expectedLowerValue,
          expressionDomain: criterionMeta.expressionDomain,
        })
      ) {
        throw createBadRequestError(
          "The lower pairwise value must equal the reflected inverse of its upper value.",
          {
            code: "PAIRWISE_REFLECTION_MISMATCH",
            field: `${lowerField}.value`,
          }
        );
      }

      canonicalMatrix[pair.rowAlternativeId][pair.columnAlternativeId] = {
        value: normalizedUpperValue,
      };
      canonicalMatrix[pair.columnAlternativeId][pair.rowAlternativeId] = {
        value: expectedLowerValue,
      };
    }

    normalizedPayload[criterionId] = canonicalMatrix;
  }

  return normalizedPayload;
};
