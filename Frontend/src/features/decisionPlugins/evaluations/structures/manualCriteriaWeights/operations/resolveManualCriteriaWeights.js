import { isPlainObject } from "../../../../../../utils/common/objects";

export const resolveManualCriteriaWeights = (evaluation) =>
  isPlainObject(evaluation) ? evaluation.weightsByCriterion || {} : {};

export const resolveCollectiveManualCriteriaWeights = (collectiveEvaluation) =>
  isPlainObject(collectiveEvaluation) &&
  isPlainObject(collectiveEvaluation.weightsByCriterion)
    ? collectiveEvaluation.weightsByCriterion
    : {};
