import {
  EVALUATION_STAGES,
  EVALUATION_STRUCTURE_KEYS,
} from "../../evaluation.constants.js";
import {
  createBadRequestError,
} from "../../../../../utils/common/errors.js";
import { getOrderedAlternativeAndCriterionNames } from "../shared/alternativeEvaluation.helpers.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildComparisonKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

const buildEmptyCell = (expressionDomain = null) => ({
  value: "",
  expressionDomain,
});

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

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

const normalizePayloadOrThrow = async ({ payload, issue, requireValue }) => {
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

  const { alternativeNames, criteria, criterionNames } =
    await getOrderedAlternativeAndCriterionNames({ issue });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria,
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

const buildGetPayload = async ({ storedEvaluation, issue }) => {
  const { alternativeNames, criteria, criterionNames } =
    await getOrderedAlternativeAndCriterionNames({ issue });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria,
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
    comparisonsByCriterion,
  };
};

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_PAIRWISE_BY_CRITERION,
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,

  async init({ issue }) {
    return buildGetPayload({
      storedEvaluation: null,
      issue,
    });
  },

  async get({ storedEvaluation, issue }) {
    return buildGetPayload({
      storedEvaluation,
      issue,
    });
  },

  async send({ payload, issue }) {
    return normalizePayloadOrThrow({
      payload,
      issue,
      requireValue: false,
    });
  },

  async submit({ payload, issue }) {
    return normalizePayloadOrThrow({
      payload,
      issue,
      requireValue: true,
    });
  },

  async validateIssueCompatibility({ issue }) {
    if (issue?.isConsensus !== true) {
      throw createBadRequestError(
        "Pairwise alternative computation currently requires a consensus issue",
        {
          field: "isConsensus",
        }
      );
    }
  },

  async validateCompletedEvaluations({ evaluations, issue }) {
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
