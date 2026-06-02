import { getOrderedAlternativesDb } from "../../issues/shared/ordering.js";
import { getOrderedAlternativeAndCriterionNames } from "./structures/shared/alternativeEvaluation.helpers.js";

export const buildEvaluationStructureContext = async ({
  issue,
  alternatives = null,
  leafCriteria = null,
  criteria = null,
  collectiveEvaluations = null,
}) => {
  const resolvedLeafCriteria = Array.isArray(leafCriteria)
    ? leafCriteria
    : Array.isArray(criteria)
      ? criteria
      : null;

  if (Array.isArray(alternatives) && Array.isArray(resolvedLeafCriteria)) {
    return {
      issue,
      alternatives,
      leafCriteria: resolvedLeafCriteria,
      collectiveEvaluations,
    };
  }

  if (!Array.isArray(alternatives) && Array.isArray(resolvedLeafCriteria)) {
    const issueId = issue?._id || issue?.id;

    return {
      issue,
      alternatives: await getOrderedAlternativesDb({
        issueId,
        issueDoc: issue?._id ? issue : null,
        select: "_id name",
        lean: true,
      }),
      leafCriteria: resolvedLeafCriteria,
      collectiveEvaluations,
    };
  }

  const resolved = await getOrderedAlternativeAndCriterionNames({ issue });

  return {
    issue,
    alternatives: Array.isArray(alternatives) ? alternatives : resolved.alternatives,
    leafCriteria: Array.isArray(resolvedLeafCriteria)
      ? resolvedLeafCriteria
      : resolved.criteria,
    collectiveEvaluations,
  };
};
