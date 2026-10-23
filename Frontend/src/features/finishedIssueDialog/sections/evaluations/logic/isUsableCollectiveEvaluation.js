import { isPlainObject } from "../../../../../utils/common/objects";
import { resolveCollective } from "../../../../decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/resolveCollective";

export const isUsableCollectiveEvaluation = ({
  structureKey,
  decisionContext,
  collectiveEvaluation,
}) => {
  if (!isPlainObject(collectiveEvaluation)) return false;
  if (structureKey !== "alternativeCriteriaMatrix") return true;

  const alternatives = decisionContext?.alternatives;
  const criteria = decisionContext?.leafCriteria;
  if (!Array.isArray(alternatives) || !alternatives.length || !Array.isArray(criteria) || !criteria.length) {
    return false;
  }
  const alternativeIds = alternatives.map((entry) => entry.id);
  const criterionIds = criteria.map((entry) => entry.id);
  const sameIds = (actual, expected) =>
    actual.length === expected.length &&
    new Set(actual).size === expected.length &&
    expected.every((id) => actual.includes(id));
  if (!sameIds(Object.keys(collectiveEvaluation), alternativeIds)) return false;
  for (const alternativeId of alternativeIds) {
    const row = collectiveEvaluation[alternativeId];
    if (!isPlainObject(row)) {
      throw new Error(`Collective payload row '${alternativeId}' must be an object.`);
    }
    if (!sameIds(Object.keys(row), criterionIds)) return false;
  }

  resolveCollective({ alternatives, criteria, collectiveEvaluation });
  return true;
};

export default isUsableCollectiveEvaluation;
