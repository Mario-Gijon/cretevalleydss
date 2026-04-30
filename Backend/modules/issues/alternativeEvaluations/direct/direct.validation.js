import { createEvaluationValidationError, getEvaluationCellDomain, getEvaluationCellValue, isEmptyEvaluationValue, validateEvaluationCellByDomain } from "../alternativeEvaluation.shared.js";

/**
 * @typedef {Object} ValidationCheckResult
 * @property {boolean} valid Indica si la validación es correcta.
 * @property {Object} [error] Error asociado, si existe.
 * @property {string} [message] Mensaje descriptivo, si existe.
 */

/**
 * Valida una matriz final alternativa x criterio antes del envío definitivo.
 *
 * @param {Object} evaluations Evaluaciones estándar.
 * @returns {ValidationCheckResult}
 */
const validateDirectEvaluations = (evaluations) => {
  let firstInvalidCell = null;

  for (const alternativeName in evaluations) {
    const criteriaValues = evaluations[alternativeName];

    for (const criterionName in criteriaValues) {
      const cell = criteriaValues[criterionName];
      const value = getEvaluationCellValue(cell);
      const domain = getEvaluationCellDomain(cell);
      const locationLabel = `[${alternativeName}, ${criterionName}]`;

      if (isEmptyEvaluationValue(value)) {
        firstInvalidCell = {
          alternative: alternativeName,
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
          alternative: alternativeName,
          criterion: criterionName,
          message: cellValidation.message,
        };
        break;
      }
    }

    if (firstInvalidCell) break;
  }

  return firstInvalidCell
    ? { valid: false, error: firstInvalidCell }
    : { valid: true, message: "" };
};

/**
 * Valida las evaluaciones directas definitivas o lanza error.
 *
 * @param {Object} evaluations Evaluaciones recibidas.
 * @returns {void}
 */
export const validateDirectEvaluationsOrThrow = (evaluations) => {
  const validation = validateDirectEvaluations(evaluations);

  if (!validation.valid) {
    throw createEvaluationValidationError({
      validation,
      fallbackMessage: "Invalid direct evaluations",
      details: {
        alternative: validation?.error?.alternative ?? null,
        criterion: validation?.error?.criterion ?? null,
      },
    });
  }
};
