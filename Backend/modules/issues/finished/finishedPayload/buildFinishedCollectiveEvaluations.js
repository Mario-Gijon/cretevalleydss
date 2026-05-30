import { isPlainObject } from "../../../../utils/common/objects.js";

export const buildFinishedCollectiveEvaluations = ({ stageResult }) => {
  const collectiveEvaluations = isPlainObject(stageResult?.collectiveEvaluations)
    ? stageResult.collectiveEvaluations
    : null;

  return collectiveEvaluations && Object.keys(collectiveEvaluations).length > 0
    ? collectiveEvaluations
    : null;
};
