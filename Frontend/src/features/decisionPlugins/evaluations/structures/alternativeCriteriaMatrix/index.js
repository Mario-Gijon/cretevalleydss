import { EVALUATION_STAGES } from "../../evaluationStages";
import AlternativeCriteriaMatrixView from "./AlternativeCriteriaMatrixView";
import { isCollectiveEvaluationUsable as validateCollective } from "./operations/resolveCollective";

const isCollectiveEvaluationUsable = ({
  decisionContext,
  collectiveEvaluation,
}) => {
  const alternatives = decisionContext?.alternatives;
  const criteria = decisionContext?.leafCriteria;
  if (
    !Array.isArray(alternatives) ||
    alternatives.length === 0 ||
    !Array.isArray(criteria) ||
    criteria.length === 0
  ) {
    return false;
  }

  const alternativeIds = alternatives.map(({ id }) => id);
  const criterionIds = criteria.map(({ id }) => id);
  if (
    alternativeIds.some((id) => typeof id !== "string") ||
    criterionIds.some((id) => typeof id !== "string") ||
    new Set(alternativeIds).size !== alternativeIds.length ||
    new Set(criterionIds).size !== criterionIds.length
  ) {
    return false;
  }

  return validateCollective({ alternatives, criteria, collectiveEvaluation });
};

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  displayLabel: "Alternative-criteria matrix",
  View: AlternativeCriteriaMatrixView,
  isCollectiveEvaluationUsable,
});
