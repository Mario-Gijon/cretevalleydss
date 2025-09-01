

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

// Validación de matrices por pares (A vs A bajo un criterio)
export const validatePairwiseEvaluations = (evaluations) => {
  let firstInvalidCell = null;

  for (const criterionId in evaluations) {
    const criterionMatrix = evaluations[criterionId];

    for (const row of criterionMatrix) {
      for (const altCol in row) {
        if (altCol === "id") continue;
        const value = row[altCol];

        // Rango [0, 1]
        if (isNaN(value) || value < 0 || value > 1) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionId,
            message: `Invalid value for ${altCol} in row ${row.id}. It must be between 0 and 1.`,
          };
          break;
        }

        // Vacíos
        if (value === "" || value === null) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionId,
            message: `Cell ${altCol} in row ${row.id} must be evaluated.`,
          };
          break;
        }

        // Máx 2 decimales
        const roundedValue = Math.round(value * 100) / 100;
        if (value !== roundedValue) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionId,
            message: `Value for ${altCol} in row ${row.id} must have at most two decimals.`,
          };
          break;
        }

        // Inverso debe estar
        const inverseRow = criterionMatrix.find(r => r.id === altCol);
        const inverseCell = inverseRow?.[row.id];
        if (
          inverseCell === "" ||
          inverseCell === null ||
          isNaN(inverseCell) ||
          inverseCell < 0 ||
          inverseCell > 1
        ) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionId,
            message: `Cell for ${altCol} and row ${row.id} has no inverse evaluation.`,
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

// Validación de matrices AxC (Alternativa vs Criterio)
export const validateEvaluations = (evaluations) => {
  let firstInvalidCell = null;

  for (const alternativeName in evaluations) {
    const criteriaEvaluations = evaluations[alternativeName];

    for (const criterionName in criteriaEvaluations) {
      const value = criteriaEvaluations[criterionName];

      // Vacío o nulo
      if (value === "" || value === null || value === undefined) {
        firstInvalidCell = {
          alternative: alternativeName,
          criterion: criterionName,
          message: `Cell [${alternativeName}, ${criterionName}] must be evaluated.`,
        };
        break;
      }

      // Rango [0, 1]
      if (isNaN(value) || value < 0 || value > 1) {
        firstInvalidCell = {
          alternative: alternativeName,
          criterion: criterionName,
          message: `Invalid value for [${alternativeName}, ${criterionName}]. Must be between 0 and 1.`,
        };
        break;
      }

      // Máx 2 decimales
      const roundedValue = Math.round(value * 100) / 100;
      if (value !== roundedValue) {
        firstInvalidCell = {
          alternative: alternativeName,
          criterion: criterionName,
          message: `Value for [${alternativeName}, ${criterionName}] must have at most two decimals.`,
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
