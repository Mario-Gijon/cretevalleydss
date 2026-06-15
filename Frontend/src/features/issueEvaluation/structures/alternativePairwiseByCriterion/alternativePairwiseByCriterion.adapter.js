const buildPairKey = (leftAlternative, rightAlternative) =>
  `${leftAlternative}::${rightAlternative}`;

const buildEmptyCell = () => ({ value: "", domain: null });

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const resolveAlternativeNames = (evaluationViewContext) =>
  evaluationViewContext?.alternatives?.names || [];

const resolveCriterionNames = (evaluationViewContext) =>
  evaluationViewContext?.criteria?.leafNames || [];

const buildMatrixPayload = ({
  alternativeNames,
  criterionNames,
  comparisonsByCriterion = {},
}) => {
  const result = {};

  for (const criterionName of criterionNames) {
    const criterionComparisons = comparisonsByCriterion?.[criterionName] || {};

    result[criterionName] = alternativeNames.map((rowAlternative) => {
      const row = { id: rowAlternative };

      for (const colAlternative of alternativeNames) {
        if (rowAlternative === colAlternative) {
          row[colAlternative] = { value: "", domain: null };
          continue;
        }

        const pairKey = buildPairKey(rowAlternative, colAlternative);
        const cell = criterionComparisons?.[pairKey];

        row[colAlternative] = {
          value: cell?.value ?? "",
          domain: cell?.expressionDomain ?? null,
        };
      }

      return row;
    });
  }

  return result;
};

const validatePairwisePayload = ({
  alternativeNames,
  criterionNames,
  viewPayload,
  allowEmpty,
}) => {
  for (const criterionName of criterionNames) {
    const rows = viewPayload?.[criterionName] || [];
    const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));

    for (const rowAlternative of alternativeNames) {
      for (const colAlternative of alternativeNames) {
        if (rowAlternative === colAlternative) continue;

        const cell =
          rowMap?.[rowAlternative]?.[colAlternative] || buildEmptyCell();
        const rawValue = cell?.value;

        if (rawValue === "" || rawValue === null || rawValue === undefined) {
          if (!allowEmpty) {
            return `Criterion: ${criterionName}, comparison ${rowAlternative} vs ${colAlternative} is required.`;
          }
          continue;
        }

        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) {
          return `Criterion: ${criterionName}, comparison ${rowAlternative} vs ${colAlternative} must be numeric.`;
        }
      }
    }
  }

  return null;
};

const buildCollectiveRowsFromMatrix = ({ matrix, alternativeNames }) => {
  if (!Array.isArray(matrix)) {
    return null;
  }

  const rows = [];

  for (let rowIndex = 0; rowIndex < alternativeNames.length; rowIndex += 1) {
    const rowAlternative = alternativeNames[rowIndex];
    const sourceRow = matrix[rowIndex];
    if (!Array.isArray(sourceRow)) {
      continue;
    }

    const row = { id: rowAlternative };

    for (let colIndex = 0; colIndex < alternativeNames.length; colIndex += 1) {
      const colAlternative = alternativeNames[colIndex];

      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          expressionDomain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      row[colAlternative] = {
        value: sourceRow[colIndex] ?? "",
        expressionDomain: null,
      };
    }

    rows.push(row);
  }

  return rows.length > 0 ? rows : null;
};

const buildCollectiveRowsFromPairMap = ({ criterionPairs, alternativeNames }) => {
  if (!isPlainObject(criterionPairs)) {
    return null;
  }

  const rows = [];

  for (const rowAlternative of alternativeNames) {
    const row = { id: rowAlternative };

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          expressionDomain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      const pairKey = buildPairKey(rowAlternative, colAlternative);
      const cell = criterionPairs[pairKey];
      const value =
        cell !== null && typeof cell === "object" && !Array.isArray(cell)
          ? cell.value
          : cell;

      row[colAlternative] = {
        value:
          value === null || value === undefined || value === ""
            ? ""
            : value,
        expressionDomain: null,
      };
    }

    rows.push(row);
  }

  return rows.length > 0 ? rows : null;
};

export const alternativePairwiseByCriterionAdapter = Object.freeze({
  buildEmptyPayload({ evaluationViewContext }) {
    const alternativeNames = resolveAlternativeNames(evaluationViewContext);
    const criterionNames = resolveCriterionNames(evaluationViewContext);

    return buildMatrixPayload({
      alternativeNames,
      criterionNames,
    });
  },

  fromBackendPayload({ backendPayload, evaluationViewContext }) {
    const alternativeNames = resolveAlternativeNames(evaluationViewContext);
    const criterionNames = resolveCriterionNames(evaluationViewContext);

    return buildMatrixPayload({
      alternativeNames,
      criterionNames,
      comparisonsByCriterion: backendPayload?.comparisonsByCriterion || {},
    });
  },

  toBackendPayload({ viewPayload, evaluationViewContext }) {
    const alternativeNames = resolveAlternativeNames(evaluationViewContext);
    const criterionNames = resolveCriterionNames(evaluationViewContext);
    const comparisonsByCriterion = {};

    for (const criterionName of criterionNames) {
      const rows = viewPayload?.[criterionName] || [];
      const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));
      const criterionPayload = {};

      for (const rowAlternative of alternativeNames) {
        for (const colAlternative of alternativeNames) {
          if (rowAlternative === colAlternative) continue;

          const cell =
            rowMap?.[rowAlternative]?.[colAlternative] || buildEmptyCell();
          criterionPayload[buildPairKey(rowAlternative, colAlternative)] = {
            value: cell?.value ?? "",
            expressionDomain: cell?.domain ?? null,
          };
        }
      }

      comparisonsByCriterion[criterionName] = criterionPayload;
    }

    return { comparisonsByCriterion };
  },

  clearViewPayload({ viewPayload, evaluationViewContext }) {
    const alternativeNames = resolveAlternativeNames(evaluationViewContext);
    const criterionNames = resolveCriterionNames(evaluationViewContext);
    const cleared = {};

    for (const criterionName of criterionNames) {
      const rows = viewPayload?.[criterionName] || [];
      const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));

      cleared[criterionName] = alternativeNames.map((rowAlternative) => {
        const row = { id: rowAlternative };

        for (const colAlternative of alternativeNames) {
          if (rowAlternative === colAlternative) {
            row[colAlternative] = { value: "", domain: null };
            continue;
          }

          const previousCell =
            rowMap?.[rowAlternative]?.[colAlternative] || buildEmptyCell();
          row[colAlternative] = {
            value: "",
            domain: previousCell?.domain ?? null,
          };
        }

        return row;
      });
    }

    return cleared;
  },

  validateDraft({ viewPayload, evaluationViewContext }) {
    return validatePairwisePayload({
      alternativeNames: resolveAlternativeNames(evaluationViewContext),
      criterionNames: resolveCriterionNames(evaluationViewContext),
      viewPayload,
      allowEmpty: true,
    });
  },

  validateSubmit({ viewPayload, evaluationViewContext }) {
    return validatePairwisePayload({
      alternativeNames: resolveAlternativeNames(evaluationViewContext),
      criterionNames: resolveCriterionNames(evaluationViewContext),
      viewPayload,
      allowEmpty: false,
    });
  },

  resolveCollectivePayload({ collectiveReference, evaluationViewContext }) {
    if (!isPlainObject(collectiveReference)) {
      return null;
    }

    const source = isPlainObject(collectiveReference.collectiveEvaluations)
      ? collectiveReference.collectiveEvaluations
      : null;

    if (!source) {
      return null;
    }

    const criterionNames = resolveCriterionNames(evaluationViewContext);
    const alternativeNames = resolveAlternativeNames(evaluationViewContext);
    const output = {};

    for (const criterionName of criterionNames) {
      const criterionCollective = source[criterionName];

      if (
        Array.isArray(criterionCollective) &&
        criterionCollective.length > 0 &&
        isPlainObject(criterionCollective[0]) &&
        "id" in criterionCollective[0]
      ) {
        output[criterionName] = criterionCollective;
        continue;
      }

      if (Array.isArray(criterionCollective)) {
        const mappedRows = buildCollectiveRowsFromMatrix({
          matrix: criterionCollective,
          alternativeNames,
        });

        if (mappedRows) {
          output[criterionName] = mappedRows;
        }
        continue;
      }

      if (isPlainObject(criterionCollective)) {
        const mappedRows = buildCollectiveRowsFromPairMap({
          criterionPairs: criterionCollective,
          alternativeNames,
        });

        if (mappedRows) {
          output[criterionName] = mappedRows;
        }
      }
    }

    return Object.keys(output).length > 0 ? output : null;
  },
});
