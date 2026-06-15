import { validateDirectEvaluations } from "./directEvaluation.validation";

const buildKey = (alternativeName, criterionName) =>
  `${alternativeName}::${criterionName}`;

const buildEmptyCell = () => ({ value: "", domain: null });

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

const resolveAlternativeNames = (evaluationViewContext) =>
  evaluationViewContext?.alternatives?.names || [];

const resolveCriterionNames = (evaluationViewContext) =>
  evaluationViewContext?.criteria?.leafNames || [];

const buildMatrixPayload = ({ alternativeNames, criterionNames, cells = {} }) => {
  const matrix = {};

  for (const alternativeName of alternativeNames) {
    matrix[alternativeName] = {};
    for (const criterionName of criterionNames) {
      const key = buildKey(alternativeName, criterionName);
      const cell = cells?.[key];
      matrix[alternativeName][criterionName] = {
        value: cell?.value ?? "",
        domain: cell?.expressionDomain ?? null,
      };
    }
  }

  return matrix;
};

export const alternativeCriteriaMatrixAdapter = Object.freeze({
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
    const cells = backendPayload?.cells || {};

    return buildMatrixPayload({
      alternativeNames,
      criterionNames,
      cells,
    });
  },

  toBackendPayload({ viewPayload, evaluationViewContext }) {
    const alternativeNames = resolveAlternativeNames(evaluationViewContext);
    const criterionNames = resolveCriterionNames(evaluationViewContext);
    const cells = {};

    for (const alternativeName of alternativeNames) {
      for (const criterionName of criterionNames) {
        const cell =
          viewPayload?.[alternativeName]?.[criterionName] || buildEmptyCell();

        cells[buildKey(alternativeName, criterionName)] =
          normalizeCellForBackendPayload(cell);
      }
    }

    return { cells };
  },

  clearViewPayload({ viewPayload, evaluationViewContext }) {
    const alternativeNames = resolveAlternativeNames(evaluationViewContext);
    const criterionNames = resolveCriterionNames(evaluationViewContext);
    const cleared = {};

    for (const alternativeName of alternativeNames) {
      cleared[alternativeName] = {};
      for (const criterionName of criterionNames) {
        const previousCell =
          viewPayload?.[alternativeName]?.[criterionName] || buildEmptyCell();

        cleared[alternativeName][criterionName] = {
          value: "",
          domain: previousCell?.domain ?? null,
        };
      }
    }

    return cleared;
  },

  validateDraft({ viewPayload, evaluationViewContext }) {
    const result = validateDirectEvaluations(viewPayload, {
      leafCriteria: resolveCriterionNames(evaluationViewContext),
      allowEmpty: true,
    });

    return result.valid ? null : result.error;
  },

  validateSubmit({ viewPayload, evaluationViewContext }) {
    const result = validateDirectEvaluations(viewPayload, {
      leafCriteria: resolveCriterionNames(evaluationViewContext),
      allowEmpty: false,
    });

    return result.valid ? null : result.error;
  },

  resolveCollectivePayload({ collectiveReference }) {
    if (
      !collectiveReference ||
      typeof collectiveReference !== "object" ||
      Array.isArray(collectiveReference)
    ) {
      return null;
    }

    const collectiveEvaluations = collectiveReference.collectiveEvaluations;
    return collectiveEvaluations &&
      typeof collectiveEvaluations === "object" &&
      !Array.isArray(collectiveEvaluations)
      ? collectiveEvaluations
      : null;
  },
});
