

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
export const validatePairwiseEvaluations = (evaluations, { leafCriteria = [], allowEmpty = false } = {}) => {
  let firstInvalidCell = null;

  for (const criterionId in evaluations) {
    // 🔹 Si no es criterio hoja, lo saltamos
    if (leafCriteria.length > 0 && !leafCriteria.includes(criterionId)) continue;

    const criterionMatrix = evaluations[criterionId];

    for (const row of criterionMatrix) {
      for (const altCol in row) {
        if (altCol === "id") continue;
        const value = row[altCol];

        if (!allowEmpty) {
          if (value === "" || value === null) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionId,
              message: `Cell [${row.id}, ${altCol}] must be evaluated.`,
            };
            break;
          }
        }

        if (value !== "" && value !== null) {
          if (isNaN(value) || value < 0 || value > 1) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionId,
              message: `Invalid value for [${row.id}, ${altCol}]. Must be between 0 and 1.`,
            };
            break;
          }

          const roundedValue = Math.round(value * 100) / 100;
          if (value !== roundedValue) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionId,
              message: `Value for [${row.id}, ${altCol}] must have at most two decimals.`,
            };
            break;
          }
        }

        // Inverso debe estar (solo si no es vacío)
        if (value !== "" && value !== null) {
          const inverseRow = criterionMatrix.find(r => r.id === altCol);
          const inverseCell = inverseRow?.[row.id];
          if (inverseCell === "" || inverseCell === null || isNaN(inverseCell)) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionId,
              message: `Cell [${altCol}, ${row.id}] has no inverse evaluation.`,
            };
            break;
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

