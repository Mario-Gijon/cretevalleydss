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

const resolveAlternativeNames = (evaluationContext) =>
  evaluationContext?.alternatives?.names || [];

const resolveCriterionNames = (evaluationContext) =>
  evaluationContext?.criteria?.leafNames || [];

const resolveCriterionDomain = (evaluationContext, criterionName) =>
  evaluationContext?.domains?.byCriterionName?.[criterionName] || null;

const buildMatrixPayload = ({
  alternativeNames,
  criterionNames,
  evaluationContext,
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
        domain:
          cell?.expressionDomain ?? resolveCriterionDomain(evaluationContext, criterionName),
      };
    }
  }

  return matrix;
};

export const alternativeCriteriaMatrixAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    return buildMatrixPayload({
      alternativeNames: resolveAlternativeNames(evaluationContext),
      criterionNames: resolveCriterionNames(evaluationContext),
      evaluationContext,
    });
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    return buildMatrixPayload({
      alternativeNames: resolveAlternativeNames(evaluationContext),
      criterionNames: resolveCriterionNames(evaluationContext),
      evaluationContext,
      cells: backendPayload?.cells || {},
    });
  },

  toBackendPayload({ evaluationContext, evaluationPayload }) {
    const alternativeNames = resolveAlternativeNames(evaluationContext);
    const criterionNames = resolveCriterionNames(evaluationContext);
    const cells = {};

    for (const alternativeName of alternativeNames) {
      for (const criterionName of criterionNames) {
        const cell = evaluationPayload?.[alternativeName]?.[criterionName] || {
          value: "",
          domain: resolveCriterionDomain(evaluationContext, criterionName),
        };

        cells[buildKey(alternativeName, criterionName)] =
          normalizeCellForBackendPayload(cell);
      }
    }

    return { cells };
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    const result = validateDirectEvaluations(evaluationPayload, {
      leafCriteria: resolveCriterionNames(evaluationContext),
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
