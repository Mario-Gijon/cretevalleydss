const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildCell = ({ value = "", domain = null, isNeutralFallback = false }) => ({
  value,
  domain,
  ...(isNeutralFallback ? { isNeutralFallback: true } : {}),
});

const getAlternativeItems = (evaluationContext) =>
  Array.isArray(evaluationContext?.alternatives)
    ? evaluationContext.alternatives
        .map((alternative) => ({
          id: String(alternative?.id ?? alternative?._id ?? "").trim(),
          name: String(alternative?.name ?? "").trim(),
        }))
        .filter((alternative) => alternative.id && alternative.name)
    : [];

const getCriteria = (evaluationContext) =>
  Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => ({
          ...criterion,
          id: String(criterion?.id ?? criterion?._id ?? "").trim(),
          name: String(criterion?.name ?? "").trim(),
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];

const buildRowsFromNestedMap = ({
  alternatives,
  criterionComparisons = {},
  domain = null,
}) =>
  alternatives.map((rowAlternative) => {
    const row = {
      id: rowAlternative.id,
      alternativeLabel: rowAlternative.name,
    };
    const criterionRow = isPlainObject(criterionComparisons?.[rowAlternative.id])
      ? criterionComparisons[rowAlternative.id]
      : {};

    for (const colAlternative of alternatives) {
      if (rowAlternative.id === colAlternative.id) {
        row[colAlternative.id] = buildCell({
          value: "Neutral",
          domain,
          isNeutralFallback: true,
        });
        continue;
      }

      const cell = criterionRow?.[colAlternative.id];
      row[colAlternative.id] = buildCell({
        value: cell?.value ?? "",
        domain: cell?.expressionDomain ?? cell?.domain ?? domain,
      });
    }

    return row;
  });

const buildMatrixPayload = ({
  alternatives,
  criteria,
  comparisonsByCriterion = {},
}) =>
  Object.fromEntries(
    criteria.map((criterion) => [
      criterion.id,
      buildRowsFromNestedMap({
        alternatives,
        criterionComparisons: comparisonsByCriterion?.[criterion.id] || {},
        domain: criterion.expressionDomain,
      }),
    ])
  );

const buildCollectiveRows = ({
  criterionSource,
  alternatives,
  domain = null,
}) => {
  if (!isPlainObject(criterionSource)) {
    return null;
  }

  return buildRowsFromNestedMap({
    alternatives,
    criterionComparisons: criterionSource,
    domain,
  });
};

const validatePairwisePayload = ({
  alternatives,
  criteria,
  evaluationPayload,
  allowEmpty,
}) => {
  for (const criterion of criteria) {
    const rows = evaluationPayload?.[criterion.id] || [];
    const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));

    for (const rowAlternative of alternatives) {
      for (const colAlternative of alternatives) {
        if (rowAlternative.id === colAlternative.id) continue;

        const cell = rowMap?.[rowAlternative.id]?.[colAlternative.id];
        const rawValue =
          cell && typeof cell === "object" && !Array.isArray(cell)
            ? cell?.value
            : cell;

        if (rawValue === "" || rawValue === null || rawValue === undefined) {
          if (!allowEmpty) {
            return {
              valid: false,
              message: `Criterion: ${criterion.name}, comparison ${rowAlternative.name} vs ${colAlternative.name} is required.`,
            };
          }
          continue;
        }

        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) {
          return {
            valid: false,
            message: `Criterion: ${criterion.name}, comparison ${rowAlternative.name} vs ${colAlternative.name} must be numeric.`,
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
      alternatives: getAlternativeItems(evaluationContext),
      criteria: getCriteria(evaluationContext),
    });
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    return buildMatrixPayload({
      alternatives: getAlternativeItems(evaluationContext),
      criteria: getCriteria(evaluationContext),
      comparisonsByCriterion: backendPayload || {},
    });
  },

  toBackendPayload({ evaluationContext, evaluationPayload }) {
    const alternatives = getAlternativeItems(evaluationContext);
    const criteria = getCriteria(evaluationContext);
    const comparisonsByCriterion = {};

    for (const criterion of criteria) {
      const rows = evaluationPayload?.[criterion.id] || [];
      const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));
      const criterionPayload = {};

      for (const rowAlternative of alternatives) {
        criterionPayload[rowAlternative.id] = {};

        for (const colAlternative of alternatives) {
          if (rowAlternative.id === colAlternative.id) continue;

          const cell = rowMap?.[rowAlternative.id]?.[colAlternative.id];
          criterionPayload[rowAlternative.id][colAlternative.id] = {
            value:
              cell && typeof cell === "object" && !Array.isArray(cell)
                ? cell?.value ?? ""
                : cell ?? "",
            expressionDomain:
              cell && typeof cell === "object" && !Array.isArray(cell)
                ? cell?.domain ?? cell?.expressionDomain ?? null
                : null,
          };
        }
      }

      comparisonsByCriterion[criterion.id] = criterionPayload;
    }

    return comparisonsByCriterion;
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    return validatePairwisePayload({
      alternatives: getAlternativeItems(evaluationContext),
      criteria: getCriteria(evaluationContext),
      evaluationPayload,
      allowEmpty: mode === "draft",
    });
  },

  fromCollectivePayload({ evaluationContext, collectivePayload }) {
    if (!isPlainObject(collectivePayload)) {
      return null;
    }

    const criteria = getCriteria(evaluationContext);
    const alternatives = getAlternativeItems(evaluationContext);
    const output = {};

    for (const criterion of criteria) {
      const criterionCollective = collectivePayload[criterion.id];
      const mappedRows = buildCollectiveRows({
        criterionSource: criterionCollective,
        alternatives,
        domain: criterion.expressionDomain,
      });

      if (mappedRows) {
        output[criterion.id] = mappedRows;
      }
    }

    return Object.keys(output).length > 0 ? output : null;
  },
});
