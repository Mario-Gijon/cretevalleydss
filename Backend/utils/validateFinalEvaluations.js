// Función de validación en el backend (similar a la del frontend)
export const validateFinalEvaluations = (evaluations) => {
  let firstInvalidCell = null; // Guardar la primera celda vacía encontrada

  for (const criterionName in evaluations) {
    const criterionMatrix = evaluations[criterionName];

    for (const row of criterionMatrix) {
      for (const altCol in row) {
        if (altCol === "id") continue; // Saltar el campo "id"
        const value = row[altCol];

        // Verificar que el valor esté en el rango [0, 1]
        if (isNaN(value) || value < 0 || value > 1) {
          firstInvalidCell = { 
            row: row.id, 
            col: altCol, 
            criterion: criterionName, 
            message: `Invalid value for ${altCol} in row ${row.id}. It must be between 0 and 1.` 
          };
          break; // Detener la búsqueda después de encontrar el primer error
        }

        // Verificar que no haya celdas vacías o nulas
        if (value === "" || value === null) {
          firstInvalidCell = { 
            row: row.id, 
            col: altCol, 
            criterion: criterionName, 
            message: `Cell ${altCol} in row ${row.id} must be evaluated.` 
          };
          break;
        }

        // Verificar que el valor esté redondeado a dos decimales
        const roundedValue = Math.round(value * 100) / 100;
        if (value !== roundedValue) {
          firstInvalidCell = { 
            row: row.id, 
            col: altCol, 
            criterion: criterionName, 
            message: `Value for ${altCol} in row ${row.id} must have at most two decimals.` 
          };
          break;
        }

        // Verificar que los valores inversos estén presentes
        const inverseRow = evaluations[criterionName].find(r => r.id === altCol);
        const inverseCell = inverseRow?.[row.id];

        if (inverseCell === "" || inverseCell === null || isNaN(inverseCell) || inverseCell < 0 || inverseCell > 1) {
          firstInvalidCell = { 
            row: row.id, 
            col: altCol, 
            criterion: criterionName, 
            message: `Cell for ${altCol} and row ${row.id} has no inverse evaluation.` 
          };
          break;
        }
      }
      if (firstInvalidCell) break;
    }
    if (firstInvalidCell) break;
  }

  return firstInvalidCell ? { valid: false, error: firstInvalidCell } : { valid: true, message: "" };
};