import { validateDirectEvaluations } from "./directEvaluation.validation";

const buildKey = (alternativeName, criterionName) =>
  `${alternativeName}::${criterionName}`;

const normalizeCellForBackendPayload = (cell) => {
  if (cell !== null && typeof cell === "object" && !Array.isArray(cell)) {
    return {
      value: cell?.value ?? "",
      expressionDomain: cell?.domain ?? null,
    };
  }

  return {
    value: cell ?? "",
    expressionDomain: null,
  };
};

const buildMatrixPayload = ({
  alternativeNames,
  criterionNames,
  domainsByCriterionName,
  cells = {},
}) => {
  const matrix = {};

  for (const alternativeName of alternativeNames) {
    matrix[alternativeName] = {};
    for (const criterionName of criterionNames) {
      const key = buildKey(alternativeName, criterionName);
      const cell = cells?.[key];
      matrix[alternativeName][criterionName] = {
        value: cell?.value ?? "",
        domain: cell?.expressionDomain ?? domainsByCriterionName[criterionName],
      };
    }
  }

  return matrix;
};

export const alternativeCriteriaMatrixAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    return buildMatrixPayload({
      alternativeNames: evaluationContext.alternatives.names,
      criterionNames: evaluationContext.criteria.leafNames,
      domainsByCriterionName: evaluationContext.domains.byCriterionName,
    });
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    return buildMatrixPayload({
      alternativeNames: evaluationContext.alternatives.names,
      criterionNames: evaluationContext.criteria.leafNames,
      domainsByCriterionName: evaluationContext.domains.byCriterionName,
      cells: backendPayload?.cells || {},
    });
  },

  toBackendPayload({ evaluationContext, evaluationPayload }) {
    const alternativeNames = evaluationContext.alternatives.names;
    const criterionNames = evaluationContext.criteria.leafNames;
    const domainsByCriterionName = evaluationContext.domains.byCriterionName;
    const cells = {};

    for (const alternativeName of alternativeNames) {
      for (const criterionName of criterionNames) {
        const cell = evaluationPayload?.[alternativeName]?.[criterionName] || {
          value: "",
          domain: domainsByCriterionName[criterionName],
        };

        cells[buildKey(alternativeName, criterionName)] =
          normalizeCellForBackendPayload(cell);
      }
    }

    return { cells };
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    const result = validateDirectEvaluations(evaluationPayload, {
      leafCriteria: evaluationContext.criteria.leafNames,
      allowEmpty: mode === "draft",
    });

    if (result.valid) {
      return { valid: true };
    }

    return {
      valid: false,
      message: `Alternative: ${result.error.alternative}, Criterion: ${result.error.criterion}, ${result.error.message}`,
    };
  },

  fromCollectivePayload({ collectivePayload }) {
    if (
      !collectivePayload ||
      typeof collectivePayload !== "object" ||
      Array.isArray(collectivePayload)
    ) {
      return null;
    }

    return Object.keys(collectivePayload).length > 0 ? collectivePayload : null;
  },
});
