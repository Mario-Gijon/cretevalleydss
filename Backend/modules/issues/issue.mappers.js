/**
 * Formatea un dominio de expresión para enviarlo al frontend.
 *
 * @param {Object|null|undefined} domain Dominio poblado.
 * @returns {Object|null}
 */
export const formatExpressionDomainForClient = (domain) => {
  if (!domain) return null;

  return {
    id: domain._id,
    name: domain.name,
    type: domain.type,
    ...(domain.type === "numeric" && { range: domain.numericRange }),
    ...(domain.type === "linguistic" && { labels: domain.linguisticLabels }),
  };
};

/**
 * Construye la estructura de evaluaciones pairwise agrupadas por criterio.
 *
 * @param {Array<Object>} evaluations Evaluaciones pobladas.
 * @returns {Object.<string, Array<Object>>}
 */
export const formatPairwiseEvaluationsByCriterion = (evaluations) => {
  const evaluationsByCriterion = {};

  for (const evaluation of evaluations) {
    const {
      criterion,
      alternative,
      comparedAlternative,
      value,
      expressionDomain,
    } = evaluation;

    if (!value || !criterion || !alternative) {
      continue;
    }

    const criterionName = criterion.name;
    const alternativeName = alternative.name;
    const comparedAlternativeName = comparedAlternative?.name || null;

    if (!evaluationsByCriterion[criterionName]) {
      evaluationsByCriterion[criterionName] = {};
    }

    if (!evaluationsByCriterion[criterionName][alternativeName]) {
      evaluationsByCriterion[criterionName][alternativeName] = {};
    }

    const evalData = {
      value,
      domain: expressionDomain
        ? {
            id: expressionDomain._id,
            name: expressionDomain.name,
            type: expressionDomain.type,
            ...(expressionDomain.type === "numeric" && {
              range: expressionDomain.numericRange,
            }),
            ...(expressionDomain.type === "linguistic" && {
              labels: expressionDomain.linguisticLabels,
            }),
          }
        : null,
    };

    if (comparedAlternativeName) {
      evaluationsByCriterion[criterionName][alternativeName][comparedAlternativeName] =
        evalData;
    } else {
      evaluationsByCriterion[criterionName][alternativeName][""] = evalData;
    }
  }

  const formatted = {};

  for (const criterionName of Object.keys(evaluationsByCriterion)) {
    formatted[criterionName] = Object.entries(
      evaluationsByCriterion[criterionName]
    ).map(([alternativeName, comparisons]) => ({
      id: alternativeName,
      ...comparisons,
    }));
  }

  return formatted;
};