import { validateDirectEvaluations } from "./directEvaluation.validation";

const buildKey = (alternativeName, criterionName) =>
  `${alternativeName}::${criterionName}`;

const getAlternativeNames = (evaluationContext) =>
  evaluationContext.alternatives.map((alternative) => alternative.name);

const getLeafCriteria = (evaluationContext) => evaluationContext.leafCriteria;

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
  criteria,
  cells = {},
}) => {
  const matrix = {};

  for (const alternativeName of alternativeNames) {
    matrix[alternativeName] = {};
    for (const criterion of criteria) {
      const criterionName = criterion.name;
      const key = buildKey(alternativeName, criterionName);
      const cell = cells?.[key];
      matrix[alternativeName][criterionName] = {
        value: cell?.value ?? "",
        domain: cell?.expressionDomain ?? criterion.expressionDomain,
      };
    }
  }

  return matrix;
};

export const alternativeCriteriaMatrixAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    return buildMatrixPayload({
      alternativeNames: getAlternativeNames(evaluationContext),
      criteria: getLeafCriteria(evaluationContext),
    });
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    return buildMatrixPayload({
      alternativeNames: getAlternativeNames(evaluationContext),
      criteria: getLeafCriteria(evaluationContext),
      cells: backendPayload?.cells || {},
    });
  },

  toBackendPayload({ evaluationContext, evaluationPayload }) {
    const alternativeNames = getAlternativeNames(evaluationContext);
    const criteria = getLeafCriteria(evaluationContext);
    const cells = {};

    for (const alternativeName of alternativeNames) {
      for (const criterion of criteria) {
        const criterionName = criterion.name;
        const cell = evaluationPayload?.[alternativeName]?.[criterionName] || {
          value: "",
          domain: criterion.expressionDomain,
        };

        cells[buildKey(alternativeName, criterionName)] =
          normalizeCellForBackendPayload(cell);
      }
    }

    return { cells };
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    const result = validateDirectEvaluations(evaluationPayload, {
      leafCriteria: getLeafCriteria(evaluationContext).map((criterion) => criterion.name),
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
