/**
 * Devuelve el primer dominio encontrado en una matriz pairwise.
 *
 * @param {Array} matrixRows Filas de la matriz.
 * @returns {Object|null}
 */
export const getFirstDomainFromPairwiseMatrix = (matrixRows = []) => {
  for (const row of matrixRows) {
    for (const [key, cell] of Object.entries(row || {})) {
      if (key !== "id" && cell?.domain) {
        return cell.domain;
      }
    }
  }

  return null;
};

export const buildEmptyPairwiseCell = (domain) => ({
  value: "",
  domain: domain || null,
});

export const buildDiagonalPairwiseCell = (domain) => {
  if (!domain) {
    return {
      value: "",
      domain: null,
      isNeutralFallback: true,
    };
  }

  if (domain.type === "numeric") {
    const min = Number(domain.range?.min ?? 0);
    const max = Number(domain.range?.max ?? 1);
    const step = Number(domain.range?.step);
    const midpoint = (min + max) / 2;
    const normalizedStep = Number.isFinite(step) && step > 0 ? step : null;

    const neutralValue = normalizedStep
      ? Math.round(
          Math.min(
            max,
            Math.max(
              min,
              min + Math.round((midpoint - min) / normalizedStep) * normalizedStep
            )
          ) * 100
        ) / 100
      : Math.round(midpoint * 100) / 100;

    return {
      value: neutralValue,
      domain,
      isNeutralFallback: false,
    };
  }

  if (domain.type === "linguistic") {
    const labels = domain.labels || [];
    const middleLabel = labels[Math.floor(labels.length / 2)]?.label || "";

    return {
      value: middleLabel,
      domain,
      isNeutralFallback: false,
    };
  }

  return {
    value: "",
    domain,
    isNeutralFallback: true,
  };
};

/**
 * Construye el estado de evaluaciones pairwise por criterio hoja.
 *
 * @param {Object} params
 * @param {Array} params.alternatives Lista de alternativas.
 * @param {Array} params.leafCriteria Lista de criterios hoja.
 * @param {Object} params.fetchedEvaluations Evaluaciones recuperadas del backend.
 * @returns {Object}
 */
export const buildPairwiseEvaluationsMatrix = ({
  alternatives = [],
  leafCriteria = [],
  fetchedEvaluations = {},
}) => {
  const merged = {};

  leafCriteria.forEach((criterion) => {
    const criterionName = criterion.name;
    const existingMatrix = fetchedEvaluations?.[criterionName] || [];
    const criterionDomain = getFirstDomainFromPairwiseMatrix(existingMatrix);

    merged[criterionName] = alternatives.map((alternativeRow) => ({
      id: alternativeRow,
      ...Object.fromEntries(
        alternatives.map((alternativeColumn) => {
          if (alternativeRow === alternativeColumn) {
            const existingRow = existingMatrix.find(
              (row) => row.id === alternativeRow
            );
            const existingCell = existingRow?.[alternativeColumn];

            return [
              alternativeColumn,
              existingCell || buildDiagonalPairwiseCell(criterionDomain),
            ];
          }

          const existingRow = existingMatrix.find(
            (row) => row.id === alternativeRow
          );
          const existingCell = existingRow?.[alternativeColumn];

          return [
            alternativeColumn,
            existingCell || buildEmptyPairwiseCell(criterionDomain),
          ];
        })
      ),
    }));
  });

  return merged;
};

/**
 * Limpia todas las evaluaciones pairwise conservando dominios por celda.
 *
 * @param {Object} params
 * @param {Array} params.alternatives Lista de alternativas.
 * @param {Array} params.leafCriteria Lista de criterios hoja.
 * @param {Object} params.evaluations Estado actual de evaluaciones.
 * @returns {Object}
 */
export const buildClearedPairwiseEvaluations = ({
  alternatives = [],
  leafCriteria = [],
  evaluations = {},
}) => {
  const clearedMatrices = {};

  leafCriteria.forEach((criterion) => {
    const criterionName = criterion.name;
    const existingMatrix = evaluations?.[criterionName] || [];
    const criterionDomain = getFirstDomainFromPairwiseMatrix(existingMatrix);

    clearedMatrices[criterionName] = alternatives.map((alternativeRow) => {
      const previousRow =
        existingMatrix.find((row) => row.id === alternativeRow) || {
          id: alternativeRow,
        };

      const row = { id: alternativeRow };

      alternatives.forEach((alternativeColumn) => {
        const previousCell = previousRow?.[alternativeColumn];
        const cellDomain = previousCell?.domain || criterionDomain || null;

        if (alternativeRow === alternativeColumn) {
          row[alternativeColumn] =
            previousCell && previousCell.domain
              ? buildDiagonalPairwiseCell(previousCell.domain)
              : buildDiagonalPairwiseCell(cellDomain);
        } else {
          row[alternativeColumn] = buildEmptyPairwiseCell(cellDomain);
        }
      });

      return row;
    });
  });

  return clearedMatrices;
};

/**
 * Construye el payload de guardado para evaluación pairwise.
 *
 * @param {Object} params
 * @param {Object} params.evaluations Evaluaciones actuales del diálogo.
 * @returns {Object}
 */
export const buildPairwiseSavePayload = ({ evaluations }) => evaluations;

/**
 * Construye el payload de envío para evaluación pairwise.
 *
 * @param {Object} params
 * @param {Object} params.evaluations Evaluaciones actuales del diálogo.
 * @returns {Object}
 */
export const buildPairwiseSubmitPayload = ({ evaluations }) => evaluations;

