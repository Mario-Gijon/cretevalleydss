import { toIdString } from "../../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import { buildComparisonKey } from "./alternativePairwiseByCriterion.context.js";

const formatIssueSnapshotDomain = (domain) => {
  if (!domain) {
    return null;
  }

  return {
    id: toIdString(domain._id),
    name: domain.name,
    type: domain.type,
    ...(domain.type === "numeric" && {
      range: {
        min: domain.numericRange?.min ?? null,
        max: domain.numericRange?.max ?? null,
      },
    }),
    ...(domain.type === "linguistic" && {
      labels: domain.linguisticLabels,
    }),
  };
};

const orderObjectByKeys = (obj, orderedKeys) => {
  const orderedObject = {};
  const usedKeys = new Set();

  for (const key of orderedKeys) {
    orderedObject[key] = Object.prototype.hasOwnProperty.call(obj, key)
      ? obj[key]
      : null;
    usedKeys.add(key);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (!usedKeys.has(key)) {
      orderedObject[key] = value;
    }
  }

  return orderedObject;
};

const isFilledValue = (value) =>
  !(value === null || value === undefined || value === "");

export const buildProgressMeta = ({
  storedEvaluation,
  alternativeNames,
  criterionNames,
}) => {
  const comparisonsByCriterion =
    isPlainObject(storedEvaluation?.payload?.comparisonsByCriterion)
      ? storedEvaluation.payload.comparisonsByCriterion
      : {};

  const totalItems = Object.values(comparisonsByCriterion).reduce(
    (total, criterionComparisons) =>
      total +
      (isPlainObject(criterionComparisons)
        ? Object.keys(criterionComparisons).length
        : 0),
    0
  );

  const filledItems = Object.values(comparisonsByCriterion).reduce(
    (total, criterionComparisons) => {
      if (!isPlainObject(criterionComparisons)) {
        return total;
      }

      return (
        total +
        Object.values(criterionComparisons).filter((cell) =>
          isFilledValue(cell?.value)
        ).length
      );
    },
    0
  );

  const expectedItems =
    alternativeNames.length > 0 && criterionNames.length > 0
      ? alternativeNames.length *
        criterionNames.length *
        Math.max(alternativeNames.length - 1, 0)
      : 0;

  return {
    progress: {
      expectedItems,
      totalItems,
      filledItems,
    },
  };
};

const buildCollectiveValueCell = (value) => ({
  value:
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value.value
      : value,
  expressionDomain: null,
});

const buildNeutralCollectiveCell = () => ({
  value: "Neutral",
  expressionDomain: null,
  isNeutralFallback: true,
});

const buildCollectivePairwiseRowsFromPairMap = ({
  criterionPairs,
  alternativeNames,
}) => {
  if (!isPlainObject(criterionPairs)) {
    return null;
  }

  return alternativeNames.map((rowAlternative) => {
    const row = { id: rowAlternative };

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildNeutralCollectiveCell();
        continue;
      }

      row[colAlternative] = buildCollectiveValueCell(
        criterionPairs[buildComparisonKey(rowAlternative, colAlternative)]
      );
    }

    return row;
  });
};

const buildCollectivePairwiseRowsFromMatrix = ({
  criterionMatrix,
  alternativeNames,
}) => {
  if (!Array.isArray(criterionMatrix)) {
    return null;
  }

  return alternativeNames.map((rowAlternative, rowIndex) => {
    const row = { id: rowAlternative };
    const sourceRow = Array.isArray(criterionMatrix[rowIndex])
      ? criterionMatrix[rowIndex]
      : [];

    for (const [colIndex, colAlternative] of alternativeNames.entries()) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildNeutralCollectiveCell();
        continue;
      }

      row[colAlternative] = buildCollectiveValueCell(sourceRow[colIndex]);
    }

    return row;
  });
};

const buildCollectivePairwiseRowsFromRows = ({
  criterionRows,
  alternativeNames,
}) => {
  if (!Array.isArray(criterionRows)) {
    return null;
  }

  const rowMap = new Map(
    criterionRows
      .filter((row) => isPlainObject(row) && typeof row.id === "string")
      .map((row) => [row.id, row])
  );

  if (rowMap.size === 0) {
    return null;
  }

  return alternativeNames.map((rowAlternative) => {
    const row = { id: rowAlternative };
    const sourceRow = rowMap.get(rowAlternative) || {};

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildNeutralCollectiveCell();
        continue;
      }

      row[colAlternative] = buildCollectiveValueCell(sourceRow[colAlternative]);
    }

    return row;
  });
};

const normalizeCollectiveEvaluationsForDisplay = ({
  source,
  criterionNames,
  alternativeNames,
}) => {
  if (!isPlainObject(source)) {
    return null;
  }

  const normalized = {};

  for (const criterionName of criterionNames) {
    const criterionSource = source[criterionName];
    let rows = null;

    if (Array.isArray(criterionSource)) {
      rows =
        criterionSource.length > 0 &&
        isPlainObject(criterionSource[0]) &&
        "id" in criterionSource[0]
          ? buildCollectivePairwiseRowsFromRows({
              criterionRows: criterionSource,
              alternativeNames,
            })
          : buildCollectivePairwiseRowsFromMatrix({
              criterionMatrix: criterionSource,
              alternativeNames,
            });
    } else if (isPlainObject(criterionSource)) {
      rows = buildCollectivePairwiseRowsFromPairMap({
        criterionPairs: criterionSource,
        alternativeNames,
      });
    }

    if (rows) {
      normalized[criterionName] = rows;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

export const buildDisplayMeta = ({
  alternativeNames,
  criterionNames,
  storedEvaluation,
  collectiveEvaluations,
}) => {
  const sourceComparisonsByCriterion = isPlainObject(
    storedEvaluation?.payload?.comparisonsByCriterion
  )
    ? storedEvaluation.payload.comparisonsByCriterion
    : {};
  const lastEvaluationAt = storedEvaluation?.submittedAt || null;
  const consensusPhase = storedEvaluation?.consensusPhase ?? null;
  const evaluations = {};

  for (const criterionName of criterionNames) {
    const criterionComparisons = isPlainObject(
      sourceComparisonsByCriterion[criterionName]
    )
      ? sourceComparisonsByCriterion[criterionName]
      : {};

    evaluations[criterionName] = alternativeNames.map((alternativeName) => {
      const row = {
        id: alternativeName,
      };

      for (const comparedAlternativeName of alternativeNames) {
        if (alternativeName === comparedAlternativeName) {
          continue;
        }

        const pairKey = buildComparisonKey(alternativeName, comparedAlternativeName);
        const cell = criterionComparisons[pairKey];

        row[comparedAlternativeName] = {
          value: cell?.value,
          domain: formatIssueSnapshotDomain(cell?.expressionDomain),
          timestamp: lastEvaluationAt,
          consensusPhase,
        };
      }

      return orderObjectByKeys(row, ["id", ...alternativeNames]);
    });
  }

  return {
    evaluations,
    collectiveEvaluations: normalizeCollectiveEvaluationsForDisplay({
      source: collectiveEvaluations,
      criterionNames,
      alternativeNames,
    }),
  };
};
