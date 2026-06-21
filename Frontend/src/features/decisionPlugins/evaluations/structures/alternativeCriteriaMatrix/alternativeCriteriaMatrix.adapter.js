import { validateDirectEvaluations } from "./directEvaluation.validation";

const getAlternativeItems = (evaluationContext) =>
  Array.isArray(evaluationContext?.alternatives)
    ? evaluationContext.alternatives
        .map((alternative) => ({
          id: String(alternative?.id ?? alternative?._id ?? "").trim(),
          name: String(alternative?.name ?? "").trim(),
        }))
        .filter((alternative) => alternative.id && alternative.name)
    : [];

const getLeafCriteria = (evaluationContext) =>
  Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => ({
          ...criterion,
          id: String(criterion?.id ?? criterion?._id ?? "").trim(),
          name: String(criterion?.name ?? "").trim(),
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];

const normalizeCellForFrontend = (cell, fallbackDomain) => {
  if (cell !== null && typeof cell === "object" && !Array.isArray(cell)) {
    return {
      value: cell?.value ?? "",
      domain: cell?.domain ?? cell?.expressionDomain ?? fallbackDomain ?? null,
    };
  }

  return {
    value: cell ?? "",
    domain: fallbackDomain ?? null,
  };
};

const buildMatrixPayload = ({
  alternatives,
  criteria,
  source = {},
}) =>
  Object.fromEntries(
    alternatives.map((alternative) => [
      alternative.id,
      Object.fromEntries(
        criteria.map((criterion) => [
          criterion.id,
          normalizeCellForFrontend(
            source?.[alternative.id]?.[criterion.id],
            criterion.expressionDomain
          ),
        ])
      ),
    ])
  );

export const alternativeCriteriaMatrixAdapter = Object.freeze({
  createEmptyPayload({ evaluationContext }) {
    return buildMatrixPayload({
      alternatives: getAlternativeItems(evaluationContext),
      criteria: getLeafCriteria(evaluationContext),
    });
  },

  fromBackendPayload({ evaluationContext, backendPayload }) {
    return buildMatrixPayload({
      alternatives: getAlternativeItems(evaluationContext),
      criteria: getLeafCriteria(evaluationContext),
      source: backendPayload,
    });
  },

  toBackendPayload({ evaluationPayload }) {
    return evaluationPayload && typeof evaluationPayload === "object" && !Array.isArray(evaluationPayload)
      ? evaluationPayload
      : {};
  },

  validate({ evaluationContext, evaluationPayload, mode }) {
    const alternatives = getAlternativeItems(evaluationContext);
    const criteria = getLeafCriteria(evaluationContext);
    const alternativeNameById = new Map(
      alternatives.map((alternative) => [alternative.id, alternative.name])
    );
    const criterionNameById = new Map(
      criteria.map((criterion) => [criterion.id, criterion.name])
    );

    const result = validateDirectEvaluations(evaluationPayload, {
      leafCriteria: criteria.map((criterion) => criterion.id),
      allowEmpty: mode === "draft",
    });

    if (result.valid) {
      return { valid: true };
    }

    return {
      valid: false,
      message: `Alternative: ${
        alternativeNameById.get(result.error.alternative) || result.error.alternative
      }, Criterion: ${
        criterionNameById.get(result.error.criterion) || result.error.criterion
      }, ${result.error.message}`,
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
