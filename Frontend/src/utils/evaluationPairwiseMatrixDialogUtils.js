

// Función para extraer criterios hoja con jerarquía
export const extractLeafCriteria = (criteria, parentPath = []) => {
  let leafCriteria = [];
  criteria.forEach((criterion) => {
    const currentPath = [...parentPath, criterion.name];
    if (criterion.isLeaf) {
      leafCriteria.push({ ...criterion, path: currentPath });
    } else {
      leafCriteria = [...leafCriteria, ...extractLeafCriteria(criterion.children, currentPath)];
    }
  });
  return leafCriteria;
};

const getPairwiseCellNumericValue = (cell) => {
  if (cell === "" || cell == null) {
    return null;
  }

  if (typeof cell === "object" && !Array.isArray(cell) && "value" in cell) {
    const parsed = Number(cell.value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(cell);
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
  if (max === min) return 0;
  return (value - min) / (max - min);
};

const denormalizeFromUnit = (normalizedValue, min, max) => {
  return min + normalizedValue * (max - min);
};

const getExpectedInverseValue = ({
  value,
  sourceRange,
  targetRange,
}) => {
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

// Validación de matrices por pares (A vs A bajo un criterio)
export const validatePairwiseEvaluations = (
  evaluations,
  { leafCriteria = [], allowEmpty = false } = {}
) => {
  let firstInvalidCell = null;

  for (const criterionId in evaluations) {
    if (leafCriteria.length > 0 && !leafCriteria.includes(criterionId)) continue;

    const criterionMatrix = Array.isArray(evaluations[criterionId])
      ? evaluations[criterionId]
      : [];

    for (const row of criterionMatrix) {
      for (const altCol in row) {
        if (altCol === "id") continue;
        if (row.id === altCol) continue;

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

          const inverseRow = criterionMatrix.find((r) => r.id === altCol);
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

      if (firstInvalidCell) break;
    }

    if (firstInvalidCell) break;
  }

  return firstInvalidCell
    ? { valid: false, error: firstInvalidCell }
    : { valid: true, message: "" };
};
// Validación de evaluaciones AxC
export const validateEvaluations = (evaluations, { leafCriteria = [], allowEmpty = false } = {}) => {
  let firstInvalidCell = null;

  for (const alternativeName in evaluations) {
    const criteriaEvaluations = evaluations[alternativeName];

    for (const criterionName in criteriaEvaluations) {
      // 🔹 Si no es criterio hoja, saltamos
      if (leafCriteria.length > 0 && !leafCriteria.includes(criterionName)) continue;

      const { value, domain } = criteriaEvaluations[criterionName] || {};

      if (!allowEmpty) {
        if (value === "" || value === null || value === undefined) {
          firstInvalidCell = {
            alternative: alternativeName,
            criterion: criterionName,
            message: `Cell [${alternativeName}, ${criterionName}] must be evaluated.`,
          };
          break;
        }
      }

      if (value !== "" && value !== null && value !== undefined) {
        if (domain?.type === "numeric") {
          const min = domain.range?.min ?? 0;
          const max = domain.range?.max ?? 1;

          if (isNaN(value) || value < min || value > max) {
            firstInvalidCell = {
              alternative: alternativeName,
              criterion: criterionName,
              message: `Invalid value for [${alternativeName}, ${criterionName}]. Must be between ${min} and ${max}.`,
            };
            break;
          }

          const roundedValue = Math.round(value * 100) / 100;
          if (value !== roundedValue) {
            firstInvalidCell = {
              alternative: alternativeName,
              criterion: criterionName,
              message: `Value for [${alternativeName}, ${criterionName}] must have at most two decimals.`,
            };
            break;
          }
        } else if (domain?.type === "linguistic") {
          const validLabels = domain.labels?.map((l) => l.label) || [];
          if (!validLabels.includes(value)) {
            firstInvalidCell = {
              alternative: alternativeName,
              criterion: criterionName,
              message: `Invalid label for [${alternativeName}, ${criterionName}]. Must be one of: ${validLabels.join(", ")}.`,
            };
            break;
          }
        }
      }
    }
    if (firstInvalidCell) break;
  }

  return firstInvalidCell
    ? { valid: false, error: firstInvalidCell }
    : { valid: true, message: "" };
};

