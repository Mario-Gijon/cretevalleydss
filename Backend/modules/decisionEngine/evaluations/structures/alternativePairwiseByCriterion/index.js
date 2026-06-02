import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import {
  createBadRequestError,
} from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import { toIdString } from "../../../../../utils/common/ids.js";
import { getOrderedAlternativeAndCriterionNames } from "../shared/alternativeEvaluation.helpers.js";

const buildComparisonKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

const buildEmptyCell = (expressionDomain = null) => ({
  value: "",
  expressionDomain,
});

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const isFilledValue = (value) =>
  !(value === null || value === undefined || value === "");

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

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

const resolveRequireValueFromModeOrThrow = (mode) => {
  if (mode === EVALUATION_SAVE_MODES.DRAFT) {
    return false;
  }

  if (mode === EVALUATION_SAVE_MODES.SUBMIT) {
    return true;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};

const validateCellValueByDomainOrThrow = ({
  value,
  expressionDomain,
  field,
}) => {
  const domainType = expressionDomain?.type;

  if (domainType === "numeric") {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      throw createBadRequestError("Pairwise value must be numeric", { field });
    }

    const min = expressionDomain?.numericRange?.min;
    const max = expressionDomain?.numericRange?.max;

    if (Number.isFinite(min) && numericValue < min) {
      throw createBadRequestError(
        `Pairwise value must be greater than or equal to ${min}`,
        { field }
      );
    }

    if (Number.isFinite(max) && numericValue > max) {
      throw createBadRequestError(
        `Pairwise value must be lower than or equal to ${max}`,
        { field }
      );
    }

    return numericValue;
  }

  if (domainType === "linguistic") {
    const labelValue = normalizeText(value);
    const allowedLabels = Array.isArray(expressionDomain?.linguisticLabels)
      ? expressionDomain.linguisticLabels
          .map((entry) => normalizeText(entry?.label))
          .filter(Boolean)
      : [];

    if (allowedLabels.length === 0) {
      throw createBadRequestError(
        "Linguistic expression domain does not define labels",
        { field }
      );
    }

    if (!allowedLabels.includes(labelValue)) {
      throw createBadRequestError(
        "Linguistic pairwise value must match one of the configured labels",
        { field }
      );
    }

    return labelValue;
  }

  throw createBadRequestError(
    `Unsupported expression domain type: ${String(domainType || "unknown")}`,
    { field }
  );
};

const normalizeCellOrThrow = ({
  cell,
  requireValue,
  field,
  expectedExpressionDomain,
}) => {
  if (!isPlainObject(cell)) {
    throw createBadRequestError("Comparison cell must be an object", { field });
  }

  const rawValue = cell.value;
  const hasValue = !(rawValue === "" || rawValue === null || rawValue === undefined);

  if (requireValue && !hasValue) {
    throw createBadRequestError(
      "All comparisons must include a value for submit",
      {
        field,
      }
    );
  }

  if (!hasValue) {
    return buildEmptyCell(expectedExpressionDomain);
  }

  const normalizedValue = validateCellValueByDomainOrThrow({
    value: rawValue,
    expressionDomain: expectedExpressionDomain,
    field,
  });

  return {
    value: normalizedValue,
    expressionDomain: expectedExpressionDomain,
  };
};

const buildExpectedPairsByCriterion = ({ criteria, alternativeNames }) => {
  const expectedPairsByCriterion = {};

  for (const criterion of criteria) {
    const criterionName = String(criterion?.name || "");
    expectedPairsByCriterion[criterionName] = {
      pairs: [],
      expressionDomain: criterion?.expressionDomain || null,
    };

    for (const alternativeA of alternativeNames) {
      for (const alternativeB of alternativeNames) {
        if (alternativeA === alternativeB) {
          continue;
        }

        expectedPairsByCriterion[criterionName].pairs.push(
          buildComparisonKey(alternativeA, alternativeB)
        );
      }
    }
  }

  return expectedPairsByCriterion;
};

const resolveAlternativesAndCriteria = async ({ issue, alternatives, criteria }) => {
  const normalizedAlternatives = Array.isArray(alternatives)
    ? alternatives
        .map((alternative) =>
          typeof alternative === "string"
            ? alternative
            : String(alternative?.name || "")
        )
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const normalizedCriteria = Array.isArray(criteria)
    ? criteria
        .map((criterion) =>
          typeof criterion === "string"
            ? {
                name: criterion.trim(),
                expressionDomain: null,
              }
            : {
                name: String(criterion?.name || "").trim(),
                expressionDomain: criterion?.expressionDomain || null,
              }
        )
        .filter((criterion) => criterion.name)
    : [];

  if (normalizedAlternatives.length > 0 && normalizedCriteria.length > 0) {
    return {
      alternativeNames: normalizedAlternatives,
      criteria: normalizedCriteria,
      criterionNames: normalizedCriteria.map((criterion) => criterion.name),
    };
  }

  return getOrderedAlternativeAndCriterionNames({ issue });
};

const buildProgressMeta = ({ storedEvaluation, alternativeNames, criterionNames }) => {
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

const buildDisplayMeta = ({
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

const isNonEmptyValue = (value) =>
  !(value === "" || value === null || value === undefined);

const validateCompletedPairwiseEvaluationPayloadsOrThrow = ({
  evaluations,
  criterionNames,
  expectedPairsByCriterion,
}) => {
  for (const evaluation of evaluations) {
    const comparisonsByCriterion = evaluation?.payload?.comparisonsByCriterion;

    if (!isPlainObject(comparisonsByCriterion)) {
      throw createBadRequestError(
        "Completed pairwise evaluation payload.comparisonsByCriterion is required",
        {
          field: "payload.comparisonsByCriterion",
        }
      );
    }

    const unknownCriteriaKeys = Object.keys(comparisonsByCriterion).filter(
      (criterionName) => !criterionNames.includes(criterionName)
    );

    if (unknownCriteriaKeys.length > 0) {
      throw createBadRequestError(
        "Completed pairwise evaluation contains unknown criterion keys",
        {
          field: "payload.comparisonsByCriterion",
          details: {
            unknownCriteriaKeys,
          },
        }
      );
    }

    for (const criterionName of criterionNames) {
      const criterionComparisons = comparisonsByCriterion[criterionName];
      if (!isPlainObject(criterionComparisons)) {
        throw createBadRequestError(
          `Completed pairwise evaluation is missing criterion '${criterionName}' comparisons`,
          {
            field: "payload.comparisonsByCriterion",
          }
        );
      }

      const expectedPairs = expectedPairsByCriterion[criterionName]?.pairs || [];
      const expectedPairSet = new Set(expectedPairs);

      const unknownPairKeys = Object.keys(criterionComparisons).filter(
        (pairKey) => !expectedPairSet.has(pairKey)
      );

      if (unknownPairKeys.length > 0) {
        throw createBadRequestError(
          `Completed pairwise evaluation contains unknown pairs for criterion '${criterionName}'`,
          {
            field: "payload.comparisonsByCriterion",
            details: {
              criterionName,
              unknownPairKeys,
            },
          }
        );
      }

      for (const pairKey of expectedPairs) {
        const cell = criterionComparisons[pairKey];
        if (!isPlainObject(cell) || !isNonEmptyValue(cell.value)) {
          throw createBadRequestError(
            "Completed pairwise evaluation is missing required comparison values",
            {
              field: "payload.comparisonsByCriterion",
              details: {
                criterionName,
                pairKey,
              },
            }
          );
        }

        validateCellValueByDomainOrThrow({
          value: cell.value,
          expressionDomain:
            expectedPairsByCriterion[criterionName]?.expressionDomain || null,
          field: "payload.comparisonsByCriterion",
        });
      }
    }
  }
};

const normalizePayloadOrThrow = async ({
  payload,
  issue,
  requireValue,
  alternatives,
  criteria,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "evaluations") ||
    Object.prototype.hasOwnProperty.call(payload, "rows") ||
    Object.prototype.hasOwnProperty.call(payload, "matrix") ||
    Object.prototype.hasOwnProperty.call(payload, "direct") ||
    Object.prototype.hasOwnProperty.call(payload, "pairwiseAlternatives")
  ) {
    throw createBadRequestError(
      "Unsupported alternative pairwise payload shape",
      {
        field: "payload",
      }
    );
  }

  if (!isPlainObject(payload.comparisonsByCriterion)) {
    throw createBadRequestError(
      "payload.comparisonsByCriterion must be an object",
      {
        field: "payload.comparisonsByCriterion",
      }
    );
  }

  const {
    alternativeNames,
    criteria: resolvedCriteria,
    criterionNames,
  } = await resolveAlternativesAndCriteria({
    issue,
    alternatives,
    criteria,
  });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria: resolvedCriteria,
    alternativeNames,
  });

  const incomingCriteriaKeys = Object.keys(payload.comparisonsByCriterion);
  const unknownCriteriaKeys = incomingCriteriaKeys.filter(
    (criterionName) => !criterionNames.includes(criterionName)
  );

  if (unknownCriteriaKeys.length > 0) {
    throw createBadRequestError(
      "payload.comparisonsByCriterion contains unknown criterion keys",
      {
        field: "payload.comparisonsByCriterion",
      }
    );
  }

  const comparisonsByCriterion = {};

  for (const criterionName of criterionNames) {
    const expectedPairsMeta = expectedPairsByCriterion[criterionName];
    const expectedPairs = expectedPairsMeta.pairs;
    const expectedExpressionDomain = expectedPairsMeta.expressionDomain;
    const expectedPairSet = new Set(expectedPairs);
    const incomingComparisons = payload.comparisonsByCriterion[criterionName];

    if (
      incomingComparisons !== undefined &&
      !isPlainObject(incomingComparisons)
    ) {
      throw createBadRequestError(
        `payload.comparisonsByCriterion['${criterionName}'] must be an object`,
        {
          field: "payload.comparisonsByCriterion",
        }
      );
    }

    const safeIncomingComparisons = isPlainObject(incomingComparisons)
      ? incomingComparisons
      : {};

    const unknownPairKeys = Object.keys(safeIncomingComparisons).filter(
      (pairKey) => !expectedPairSet.has(pairKey)
    );

    if (unknownPairKeys.length > 0) {
      throw createBadRequestError(
        `payload.comparisonsByCriterion['${criterionName}'] contains unknown pair keys`,
        {
          field: "payload.comparisonsByCriterion",
        }
      );
    }

    comparisonsByCriterion[criterionName] = expectedPairs.reduce(
      (criterionComparisons, pairKey) => {
        const cell = safeIncomingComparisons[pairKey];

        criterionComparisons[pairKey] =
          cell === undefined
            ? buildEmptyCell(expectedExpressionDomain)
            : normalizeCellOrThrow({
                cell,
                requireValue,
                field: "payload.comparisonsByCriterion",
                expectedExpressionDomain,
              });

        return criterionComparisons;
      },
      {}
    );
  }

  return {
    comparisonsByCriterion,
  };
};

const buildGetPayload = async ({
  storedEvaluation,
  issue,
  alternatives,
  criteria,
}) => {
  const {
    alternativeNames,
    criteria: resolvedCriteria,
    criterionNames,
  } = await resolveAlternativesAndCriteria({
    issue,
    alternatives,
    criteria,
  });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria: resolvedCriteria,
    alternativeNames,
  });

  const storedComparisonsByCriterion = isPlainObject(
    storedEvaluation?.payload?.comparisonsByCriterion
  )
    ? storedEvaluation.payload.comparisonsByCriterion
    : {};

  const comparisonsByCriterion = {};

  for (const criterionName of criterionNames) {
    const expectedPairsMeta = expectedPairsByCriterion[criterionName];
    const expectedPairs = expectedPairsMeta.pairs;
    const expectedExpressionDomain = expectedPairsMeta.expressionDomain;
    const storedCriterionComparisons = isPlainObject(
      storedComparisonsByCriterion[criterionName]
    )
      ? storedComparisonsByCriterion[criterionName]
      : {};

    comparisonsByCriterion[criterionName] = expectedPairs.reduce(
      (criterionComparisons, pairKey) => {
        const storedCell = storedCriterionComparisons[pairKey];

        if (!isPlainObject(storedCell)) {
          criterionComparisons[pairKey] = {
            ...buildEmptyCell(),
            expressionDomain: expectedExpressionDomain,
          };
          return criterionComparisons;
        }

        criterionComparisons[pairKey] = {
          value:
            storedCell.value === "" ||
            storedCell.value === null ||
            storedCell.value === undefined
              ? ""
              : storedCell.value,
          expressionDomain: expectedExpressionDomain,
        };

        return criterionComparisons;
      },
      {}
    );
  }

  return {
    payload: {
      comparisonsByCriterion,
    },
    context: {
      alternativeNames,
      criteria: resolvedCriteria,
      criterionNames,
    },
  };
};

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  async get({
    storedEvaluation,
    issue,
    alternatives,
    criteria,
    collectiveEvaluations = null,
    includeMeta = false,
  }) {
    const { payload, context } = await buildGetPayload({
      storedEvaluation,
      issue,
      alternatives,
      criteria,
    });

    if (!includeMeta) {
      return payload;
    }

    return {
      ...payload,
      meta: {
        progress: buildProgressMeta({
          storedEvaluation,
          alternativeNames: context.alternativeNames,
          criterionNames: context.criterionNames,
        }).progress,
        display: buildDisplayMeta({
          alternativeNames: context.alternativeNames,
          criterionNames: context.criterionNames,
          storedEvaluation,
          collectiveEvaluations,
        }),
      },
    };
  },

  async save({ payload, issue, mode, alternatives, criteria }) {
    const requireValue = resolveRequireValueFromModeOrThrow(mode);

    return normalizePayloadOrThrow({
      payload,
      issue,
      requireValue,
      alternatives,
      criteria,
    });
  },

  async validateBeforeCompute({ evaluations, issue }) {
    const { alternativeNames, criteria, criterionNames } =
      await getOrderedAlternativeAndCriterionNames({ issue });
    const expectedPairsByCriterion = buildExpectedPairsByCriterion({
      criteria,
      alternativeNames,
    });

    validateCompletedPairwiseEvaluationPayloadsOrThrow({
      evaluations,
      criterionNames,
      expectedPairsByCriterion,
    });
  },
});
