import { isPlainObject } from "../../../utils/common/objects";

export const requireCompleteEvaluationObject = (nextEvaluation) => {
  if (!isPlainObject(nextEvaluation)) {
    throw new TypeError(
      "setEvaluation requires a complete evaluation object."
    );
  }

  return nextEvaluation;
};
