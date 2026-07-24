const isPlainObject = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const requireCompleteEvaluationObject = (nextEvaluation) => {
  if (!isPlainObject(nextEvaluation)) {
    throw new TypeError(
      "setEvaluation requires a complete evaluation object."
    );
  }

  return nextEvaluation;
};
