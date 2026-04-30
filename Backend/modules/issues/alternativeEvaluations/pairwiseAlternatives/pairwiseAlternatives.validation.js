import { createEvaluationValidationError, getEvaluationCellDomain, getEvaluationCellValue, isEmptyEvaluationValue, validateEvaluationCellByDomain } from "../alternativeEvaluation.shared.js";

/**
 * @typedef {Object} ValidationCheckResult
 * @property {boolean} valid Indica si la validación es correcta.
 * @property {Object} [error] Error asociado, si existe.
 * @property {string} [message] Mensaje descriptivo, si existe.
 */

/**
 * Valida una matriz final pairwise antes del envío definitivo.
 *
 * @param {Object} evaluations Evaluaciones pairwise.
 * @returns {ValidationCheckResult}
 */
const validatePairwiseEvaluations = (evaluations) => {
  let firstInvalidCell = null;

  for (const criterionName in evaluations) {
    const criterionMatrix = evaluations[criterionName];

    for (const row of criterionMatrix) {
      for (const altCol in row) {
        if (altCol === "id" || row.id === altCol) continue;

        const cell = row[altCol];
        const value = getEvaluationCellValue(cell);
        const domain = getEvaluationCellDomain(cell);
        const locationLabel = `[${row.id}, ${altCol}]`;

        if (isEmptyEvaluationValue(value)) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionName,
            message: `Cell ${locationLabel} must be evaluated.`,
          };
          break;
        }

        const cellValidation = validateEvaluationCellByDomain({
          value,
          domain,
          locationLabel,
        });

        if (!cellValidation.valid) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionName,
            message: cellValidation.message,
          };
          break;
        }

        const inverseRow = criterionMatrix.find(
          (matrixRow) => matrixRow.id === altCol
        );
        const inverseCell = inverseRow?.[row.id];
        const inverseValue = getEvaluationCellValue(inverseCell);

        const inverseDomain = getCellDomain(inverseCell);
        const inverseLocationLabel = `[${altCol}, ${row.id}]`;

        if (isEmptyEvaluationValue(inverseValue)) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionName,
            message: `Cell for ${locationLabel} has no valid inverse evaluation.`,
          };
          break;
        }

        const inverseValidation = validateEvaluationCellByDomain({
          value: inverseValue,
          domain: inverseDomain,
          locationLabel: inverseLocationLabel,
        });

        if (!inverseValidation.valid) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionName,
            message: inverseValidation.message,
          };
          break;
        }
      }

      if (firstInvalidCell) break;
    }

    if (firstInvalidCell) break;
  }

  return firstInvalidCell
    ? { valid: false, error: firstInvalidCell }
    : { valid: true, message: "" };
};

/**
 * Valida las evaluaciones pairwise definitivas o lanza error.
 *
 * @param {Object} evaluations Evaluaciones recibidas.
 * @returns {void}
 */
export const validatePairwiseEvaluationsOrThrow = (evaluations) => {
  const validation = validatePairwiseEvaluations(evaluations);

  if (!validation.valid) {
    throw createEvaluationValidationError({
      validation,
      fallbackMessage: "Invalid pairwise evaluations",
      details: {
        criterion: validation?.error?.criterion ?? null,
        row: validation?.error?.row ?? null,
        col: validation?.error?.col ?? null,
      },
    });
  }
};
