const buildPairKey = (leftAlternative, rightAlternative) =>
  `${leftAlternative}::${rightAlternative}`;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildCell = ({ value = "", domain = null, isNeutralFallback = false }) => ({
  value,
  domain,
  ...(isNeutralFallback ? { isNeutralFallback: true } : {}),
});

const buildRowsFromPairMap = ({
  alternativeNames,
  criterionPairs = {},
  domain = null,
}) =>
  alternativeNames.map((rowAlternative) => {
    const row = { id: rowAlternative };

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildCell({
          value: "Neutral",
          domain,
          isNeutralFallback: true,
        });
        continue;
      }

      const cell = criterionPairs?.[buildPairKey(rowAlternative, colAlternative)];
      row[colAlternative] = buildCell({
        value: cell?.value ?? "",
        domain: cell?.expressionDomain ?? domain,
      });
    }

    return row;
  });

const buildMatrixPayload = ({
  alternativeNames,
  criteria,
  comparisonsByCriterion = {},
}) =>
  Object.fromEntries(
    criteria.map((criterion) => [
      criterion.name,
      buildRowsFromPairMap({
        alternativeNames,
        criterionPairs: comparisonsByCriterion?.[criterion.name] || {},
        domain: criterion.expressionDomain,
      }),
    ])
  );

const buildCollectiveRowsFromMatrix = ({
  matrix,
  alternativeNames,
  domain = null,
}) => {
  if (!Array.isArray(matrix)) {
    return null;
  }

  return alternativeNames.map((rowAlternative, rowIndex) => {
    const row = { id: rowAlternative };
    const sourceRow = Array.isArray(matrix[rowIndex]) ? matrix[rowIndex] : [];

    for (const [colIndex, colAlternative] of alternativeNames.entries()) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildCell({
          value: "Neutral",
          domain,
          isNeutralFallback: true,
        });
        continue;
      }

      row[colAlternative] = buildCell({
        value: sourceRow[colIndex] ?? "",
        domain,
      });
    }

    return row;
  });
};

const buildCollectiveRowsFromRows = ({
  criterionRows,
  alternativeNames,
  domain = null,
}) => {
  if (!Array.isArray(criterionRows)) {
    return null;
  }

  const rowMap = new Map(
    criterionRows
      .filter((row) => isPlainObject(row) && typeof row.id === "string")
      .map((row) => [row.id, row])
  );

  return alternativeNames.map((rowAlternative) => {
    const row = { id: rowAlternative };
    const sourceRow = rowMap.get(rowAlternative) || {};

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildCell({
          value: "Neutral",
          domain,
          isNeutralFallback: true,
        });
        continue;
      }

      const cell = sourceRow[colAlternative];
      row[colAlternative] = buildCell({
        value:
          cell && typeof cell === "object" && !Array.isArray(cell)
            ? cell?.value ?? ""
            : cell ?? "",
        domain:
          cell && typeof cell === "object" && !Array.isArray(cell)
            ? cell?.expressionDomain ?? cell?.domain ?? domain
            : domain,
      });
    }

    return row;
  });
};

const buildCollectiveRows = ({
  criterionSource,
  alternativeNames,
  domain = null,
}) => {
  if (Array.isArray(criterionSource)) {
    return criterionSource.length > 0 &&
      isPlainObject(criterionSource[0]) &&
      "id" in criterionSource[0]
      ? buildCollectiveRowsFromRows({
          criterionRows: criterionSource,
          alternativeNames,
          domain,
        })
      : buildCollectiveRowsFromMatrix({
          matrix: criterionSource,
          alternativeNames,
          domain,
        });
  }

  if (isPlainObject(criterionSource)) {
    return buildRowsFromPairMap({
      alternativeNames,
      criterionPairs: criterionSource,
      domain,
    });
  }

  return null;
};

const validatePairwisePayload = ({
  alternativeNames,
  criterionNames,
  evaluationPayload,
  allowEmpty,
}) => {
  for (const criterionName of criterionNames) {
    const rows = evaluationPayload?.[criterionName] || [];
    const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));

    for (const rowAlternative of alternativeNames) {
      for (const colAlternative of alternativeNames) {
        if (rowAlternative === colAlternative) continue;

        const cell = rowMap?.[rowAlternative]?.[colAlternative];
        const rawValue =
          cell && typeof cell === "object" && !Array.isArray(cell)
            ? cell?.value
            : cell;

        if (rawValue === "" || rawValue === null || rawValue === undefined) {
          if (!allowEmpty) {
            return {
              valid: false,
              message: `Criterion: ${criterionName}, comparison ${rowAlternative} vs ${colAlternative} is required.`,
            };
          }
          continue;
        }

        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) {
          return {
            valid: false,
            message: `Criterion: ${criterionName}, comparison ${rowAlternative} vs ${colAlternative} must be numeric.`,
          };
        }
      }
    }
  }

  return { valid: true };
};

export const alternativePairwiseByCriterionAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    return buildMatrixPayload({
      alternativeNames: evaluationContext.alternatives.map((alternative) => alternative.name),
      criteria: evaluationContext.leafCriteria,
    });
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    return buildMatrixPayload({
      alternativeNames: evaluationContext.alternatives.map((alternative) => alternative.name),
      criteria: evaluationContext.leafCriteria,
      comparisonsByCriterion: backendPayload?.comparisonsByCriterion || {},
    });
  },

  toBackendPayload({ evaluationContext, evaluationPayload }) {
    const alternativeNames = evaluationContext.alternatives.map((alternative) => alternative.name);
    const criteria = evaluationContext.leafCriteria;
    const comparisonsByCriterion = {};

    for (const criterion of criteria) {
      const criterionName = criterion.name;
      const rows = evaluationPayload?.[criterionName] || [];
      const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));
      const criterionPayload = {};

      for (const rowAlternative of alternativeNames) {
        for (const colAlternative of alternativeNames) {
          if (rowAlternative === colAlternative) continue;

          const cell = rowMap?.[rowAlternative]?.[colAlternative];
          criterionPayload[buildPairKey(rowAlternative, colAlternative)] = {
            value:
              cell && typeof cell === "object" && !Array.isArray(cell)
                ? cell?.value ?? ""
                : cell ?? "",
            expressionDomain:
              cell && typeof cell === "object" && !Array.isArray(cell)
                ? cell?.domain ?? null
                : null,
          };
        }
      }

      comparisonsByCriterion[criterionName] = criterionPayload;
    }

    return { comparisonsByCriterion };
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    return validatePairwisePayload({
      alternativeNames: evaluationContext.alternatives.map((alternative) => alternative.name),
      criterionNames: evaluationContext.leafCriteria.map((criterion) => criterion.name),
      evaluationPayload,
      allowEmpty: mode === "draft",
    });
  },

  fromCollectivePayload({ evaluationContext, collectivePayload }) {
    if (!isPlainObject(collectivePayload)) {
      return null;
    }

    const criteria = evaluationContext.leafCriteria;
    const alternativeNames = evaluationContext.alternatives.map((alternative) => alternative.name);
    const output = {};

    for (const criterion of criteria) {
      const criterionName = criterion.name;
      const criterionCollective = collectivePayload[criterionName];
      const mappedRows = buildCollectiveRows({
        criterionSource: criterionCollective,
        alternativeNames,
        domain: criterion.expressionDomain,
      });

      if (mappedRows) {
        output[criterionName] = mappedRows;
      }
    }

    return Object.keys(output).length > 0 ? output : null;
  },
});
