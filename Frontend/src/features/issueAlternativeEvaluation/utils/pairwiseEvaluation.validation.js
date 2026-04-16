const getPairwiseCellValue = (cell) => {
  if (cell === "" || cell == null) {
    return null;
  }

  if (typeof cell === "object" && !Array.isArray(cell) && "value" in cell) {
    const rawValue = cell.value;

    if (rawValue === "" || rawValue == null) {
      return null;
    }

    return rawValue;
  }

  return cell;
};

const getPairwiseCellNumericValue = (cell) => {
  const rawValue = getPairwiseCellValue(cell);

  if (rawValue === "" || rawValue == null) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const getPairwiseCellRange = (cell) => {
  const min = Number(cell?.domain?.range?.min);
  const max = Number(cell?.domain?.range?.max);

  if (Number.isFinite(min) && Number.isFinite(max) && min < max) {
    return { min, max };
  }

  return { min: 0, max: 1 };
};

const round2 = (value) => Math.round(value * 100) / 100;

const normalizeToUnit = (value, min, max) => {
  if (max === min) {
    return 0;
  }

  return (value - min) / (max - min);
};

const denormalizeFromUnit = (normalizedValue, min, max) => {
  return min + normalizedValue * (max - min);
};

const getExpectedInverseValue = ({ value, sourceRange, targetRange }) => {
  const normalized = normalizeToUnit(value, sourceRange.min, sourceRange.max);
  const inverseNormalized = 1 - normalized;

  return round2(
    denormalizeFromUnit(
      inverseNormalized,
      targetRange.min,
      targetRange.max
    )
  );
};

/**
 * Valida matrices por pares alternativa x alternativa bajo cada criterio hoja.
 *
 * Esta validación está pensada para dominios numéricos pairwise.
 * Usa el rango del dominio de cada celda para comprobar:
 * - que el valor esté dentro del rango,
 * - que tenga como máximo dos decimales,
 * - y que la celda inversa sea la recíproca esperada
 *   al normalizar al intervalo [0, 1].
 *
 * @param {Object} evaluations
 * @param {Object} options
 * @param {string[]} options.leafCriteria
 * @param {boolean} options.allowEmpty
 * @returns {{valid: boolean, error?: Object, message: string}}
 */
export const validatePairwiseEvaluations = (
  evaluations,
  { leafCriteria = [], allowEmpty = false } = {}
) => {
  let firstInvalidCell = null;

  for (const criterionId in evaluations) {
    if (leafCriteria.length > 0 && !leafCriteria.includes(criterionId)) {
      continue;
    }

    const criterionMatrix = Array.isArray(evaluations[criterionId])
      ? evaluations[criterionId]
      : [];

    for (const row of criterionMatrix) {
      for (const altCol in row) {
        if (altCol === "id" || row.id === altCol) {
          continue;
        }

        const rawValue = row[altCol];
        const value = getPairwiseCellNumericValue(rawValue);
        const range = getPairwiseCellRange(rawValue);

        if (!allowEmpty && value === null) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionId,
            message: `Cell [${row.id}, ${altCol}] must be evaluated.`,
          };
          break;
        }

        if (value !== null) {
          if (value < range.min || value > range.max) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionId,
              message: `Invalid value for [${row.id}, ${altCol}]. Must be between ${range.min} and ${range.max}.`,
            };
            break;
          }

          if (Math.abs(value - round2(value)) > 1e-9) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionId,
              message: `Value for [${row.id}, ${altCol}] must have at most two decimals.`,
            };
            break;
          }

          const inverseRow = criterionMatrix.find(
            (matrixRow) => matrixRow.id === altCol
          );
          const inverseRawValue = inverseRow?.[row.id];
          const inverseValue = getPairwiseCellNumericValue(inverseRawValue);
          const inverseRange = getPairwiseCellRange(inverseRawValue);

          if (!allowEmpty && inverseValue === null) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionId,
              message: `Cell [${altCol}, ${row.id}] has no inverse evaluation.`,
            };
            break;
          }

          if (inverseValue !== null) {
            const expectedInverse = getExpectedInverseValue({
              value,
              sourceRange: range,
              targetRange: inverseRange,
            });

            if (Math.abs(inverseValue - expectedInverse) > 0.01) {
              firstInvalidCell = {
                row: row.id,
                col: altCol,
                criterion: criterionId,
                message: `Cell [${altCol}, ${row.id}] must be the inverse of [${row.id}, ${altCol}] according to its domain range.`,
              };
              break;
            }
          }
        }
      }

      if (firstInvalidCell) {
        break;
      }
    }

    if (firstInvalidCell) {
      break;
    }
  }

  return firstInvalidCell
    ? { valid: false, error: firstInvalidCell }
    : { valid: true, message: "" };
};