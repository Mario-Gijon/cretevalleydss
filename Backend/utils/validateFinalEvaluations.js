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

        // 🔹 Vacío o nulo
        if (value === "" || value === null || value === undefined) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionName,
            message: `Cell [${row.id}, ${altCol}] must be evaluated.`,
          };
          break;
        }

        if (domain?.type === "numeric") {
          const min = domain.range?.min ?? 0;
          const max = domain.range?.max ?? 1;
          const num = parseFloat(value);

          if (isNaN(num) || num < min || num > max) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionName,
              message: `Invalid value for [${row.id}, ${altCol}]. Must be between ${min} and ${max}.`,
            };
            break;
          }

          const roundedValue = Math.round(num * 100) / 100;
          if (num !== roundedValue) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionName,
              message: `Value for [${row.id}, ${altCol}] must have at most two decimals.`,
            };
            break;
          }
        } else if (domain?.type === "linguistic") {
          const validLabels = domain.labels?.map((l) => l.label) || [];
          if (!validLabels.includes(value)) {
            firstInvalidCell = {
              row: row.id,
              col: altCol,
              criterion: criterionName,
              message: `Invalid label for [${row.id}, ${altCol}]. Must be one of: ${validLabels.join(", ")}.`,
            };
            break;
          }
        }

        // 🔹 Validar inverso
        const inverseRow = criterionMatrix.find((r) => r.id === altCol);
        const inverseCell = inverseRow?.[row.id];
        const inverseValue = getCellValue(inverseCell);

        if (
          inverseValue === "" ||
          inverseValue === null ||
          inverseValue === undefined ||
          (domain?.type === "numeric" &&
            (isNaN(inverseValue) || inverseValue < 0 || inverseValue > 1))
        ) {
          firstInvalidCell = {
            row: row.id,
            col: altCol,
            criterion: criterionName,
            message: `Cell for [${row.id}, ${altCol}] has no valid inverse evaluation.`,
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

// Normalizador de celdas (para soportar { value, domain } o valores planos antiguos)
const getCellValue = (cell) => {
  if (cell && typeof cell === "object" && "value" in cell) return cell.value;
  return cell;
};

const getCellDomain = (cell) => {
  if (cell && typeof cell === "object" && "domain" in cell) return cell.domain;
  return null;
};

export const validateFinalEvaluations = (evaluations) => {
  let firstInvalidCell = null;

  for (const altName in evaluations) {
    const criteriaValues = evaluations[altName];

    for (const critName in criteriaValues) {
      const cell = criteriaValues[critName];
      const value = getCellValue(cell);
      const domain = getCellDomain(cell);

      // 🔹 Vacío o nulo
      if (value === "" || value === null || value === undefined) {
        firstInvalidCell = {
          alternative: altName,
          criterion: critName,
          message: `Cell [${altName}, ${critName}] must be evaluated.`,
        };
        break;
      }

      if (domain?.type === "numeric") {
        const min = domain.range?.min ?? 0;
        const max = domain.range?.max ?? 1;

        const num = parseFloat(value);
        if (isNaN(num) || num < min || num > max) {
          firstInvalidCell = {
            alternative: altName,
            criterion: critName,
            message: `Invalid value for [${altName}, ${critName}]. Must be between ${min} and ${max}.`,
          };
          break;
        }

        const roundedValue = Math.round(num * 100) / 100;
        if (num !== roundedValue) {
          firstInvalidCell = {
            alternative: altName,
            criterion: critName,
            message: `Value for [${altName}, ${critName}] must have at most two decimals.`,
          };
          break;
        }
      } else if (domain?.type === "linguistic") {
        const validLabels = domain.labels?.map((l) => l.label) || [];
        if (!validLabels.includes(value)) {
          firstInvalidCell = {
            alternative: altName,
            criterion: critName,
            message: `Invalid label for [${altName}, ${critName}]. Must be one of: ${validLabels.join(", ")}.`,
          };
          break;
        }
      }
    }

    if (firstInvalidCell) break;
  }

  return firstInvalidCell
    ? { valid: false, error: firstInvalidCell }
    : { valid: true, message: "" };
};
