const getCellValue = (cell) => {
  if (cell && typeof cell === "object" && "value" in cell) {
    return cell.value;
  }

  return cell;
};

const getCellDomain = (cell) => {
  if (cell && typeof cell === "object" && "domain" in cell) {
    return cell.domain;
  }

  return null;
};

const isEmptyValue = (value) => value === "" || value === null || value === undefined;

const hasMoreThanTwoDecimals = (value) => {
  const numericValue = Number(value);
  return numericValue !== Math.round(numericValue * 100) / 100;
};

const validateCellByDomain = ({ value, domain, locationLabel }) => {
  if (domain?.type === "numeric") {
    const min = domain.range?.min ?? 0;
    const max = domain.range?.max ?? 1;
    const numericValue = parseFloat(value);

    if (isNaN(numericValue) || numericValue < min || numericValue > max) {
      return {
        valid: false,
        message: `Invalid value for ${locationLabel}. Must be between ${min} and ${max}.`,
      };
    }

    if (hasMoreThanTwoDecimals(numericValue)) {
      return {
        valid: false,
        message: `Value for ${locationLabel} must have at most two decimals.`,
      };
    }
  }

  if (domain?.type === "linguistic") {
    const validLabels = domain.labels?.map((label) => label.label) || [];

    if (!validLabels.includes(value)) {
      return {
        valid: false,
        message: `Invalid label for ${locationLabel}. Must be one of: ${validLabels.join(", ")}.`,
      };
    }
  }

  return { valid: true };
};

/**
 * Valida una matriz final pairwise antes del envío definitivo.
 *
 * @param {Object} evaluations Evaluaciones pairwise.
 * @returns {{ valid: boolean, error?: Object, message?: string }}
 */
export const validateFinalPairwiseEvaluations = (evaluations) => {
  let firstInvalidCell = null;

  for (const criterionName in evaluations) {
    const criterionMatrix = evaluations[criterionName];

    for (const row of criterionMatrix) {
      for (const altCol in row) {
        if (altCol === "id") continue;

        const cell = row[altCol];
        const value = getCellValue(cell);
        const domain = getCellDomain(cell);
        const locationLabel = `[${row.id}, ${altCol}]`;

        if (isEmptyValue(value)) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionName,
            message: `Cell ${locationLabel} must be evaluated.`,
          };
          break;
        }

        const cellValidation = validateCellByDomain({ value, domain, locationLabel });

        if (!cellValidation.valid) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionName,
            message: cellValidation.message,
          };
          break;
        }

        const inverseRow = criterionMatrix.find((matrixRow) => matrixRow.id === altCol);
        const inverseCell = inverseRow?.[row.id];
        const inverseValue = getCellValue(inverseCell);

        if (
          isEmptyValue(inverseValue) ||
          (domain?.type === "numeric" &&
            (isNaN(inverseValue) || inverseValue < 0 || inverseValue > 1))
        ) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionName,
            message: `Cell for ${locationLabel} has no valid inverse evaluation.`,
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
 * Valida una matriz final alternativa x criterio antes del envío definitivo.
 *
 * @param {Object} evaluations Evaluaciones estándar.
 * @returns {{ valid: boolean, error?: Object, message?: string }}
 */
export const validateFinalEvaluations = (evaluations) => {
  let firstInvalidCell = null;

  for (const alternativeName in evaluations) {
    const criteriaValues = evaluations[alternativeName];

    for (const criterionName in criteriaValues) {
      const cell = criteriaValues[criterionName];
      const value = getCellValue(cell);
      const domain = getCellDomain(cell);
      const locationLabel = `[${alternativeName}, ${criterionName}]`;

      if (isEmptyValue(value)) {
        firstInvalidCell = {
          alternative: alternativeName,
          criterion: criterionName,
          message: `Cell ${locationLabel} must be evaluated.`,
        };
        break;
      }

      const cellValidation = validateCellByDomain({ value, domain, locationLabel });

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
 * Valida los datos finales de pesos BWM.
 *
 * @param {Object} bwmData Datos enviados.
 * @returns {{ valid: boolean, msg?: string, field?: string }}
 */
export const validateFinalWeights = (bwmData) => {
  if (!bwmData) {
    return { valid: false, msg: "Missing weight data" };
  }

  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = bwmData;

  if (!bestCriterion || !worstCriterion) {
    return { valid: false, msg: "You must select both best and worst criteria" };
  }

  const criteria = Object.keys(bestToOthers || {});
  if (criteria.length === 0) {
    return { valid: false, msg: "No criteria found for evaluation" };
  }

  for (const criterion of criteria) {
    if (criterion === bestCriterion) continue;

    const value = Number(bestToOthers[criterion]);

    if (isNaN(value) || value < 1 || value > 9) {
      return {
        valid: false,
        field: criterion,
        msg: `Invalid value in best-to-others for ${criterion}`,
      };
    }
  }

  for (const criterion of criteria) {
    if (criterion === worstCriterion) continue;

    const value = Number(othersToWorst[criterion]);

    if (isNaN(value) || value < 1 || value > 9) {
      return {
        valid: false,
        field: criterion,
        msg: `Invalid value in others-to-worst for ${criterion}`,
      };
    }
  }

  return { valid: true };
};