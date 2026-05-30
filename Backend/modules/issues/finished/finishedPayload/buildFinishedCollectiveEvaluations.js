import { isPlainObject } from "../../../../utils/common/objects.js";

const buildCollectiveEvaluationsObjectOrNull = ({ stageResult }) => {
  const collectiveEvaluations = isPlainObject(stageResult?.collectiveEvaluations)
    ? stageResult.collectiveEvaluations
    : null;

  return collectiveEvaluations && Object.keys(collectiveEvaluations).length > 0
    ? collectiveEvaluations
    : null;
};

export const buildMatrixFinishedCollectiveEvaluations = ({ stageResult }) => {
  return buildCollectiveEvaluationsObjectOrNull({ stageResult });
};

export const buildPairwiseFinishedCollectiveEvaluations = ({ stageResult }) => {
  return buildCollectiveEvaluationsObjectOrNull({ stageResult });
};
