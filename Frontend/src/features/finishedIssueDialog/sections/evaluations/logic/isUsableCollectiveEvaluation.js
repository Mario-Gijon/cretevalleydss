import { isCollectiveEvaluationUsable as checkCollectiveEvaluation } from "../../../../decisionPlugins/evaluations/registry";

export const isUsableCollectiveEvaluation = ({
  structureKey,
  decisionContext,
  collectiveEvaluation,
}) => checkCollectiveEvaluation({
  structureKey,
  decisionContext,
  collectiveEvaluation,
});

export default isUsableCollectiveEvaluation;
