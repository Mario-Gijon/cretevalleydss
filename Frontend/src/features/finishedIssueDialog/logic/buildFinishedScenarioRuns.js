const getEvaluationCompatibilityFlag = (model) =>
  model?.compatibility?.alternativeEvaluationStructure;

export const isModelCompatible = (model) => {
  if (model?.scenarioCompatibility && typeof model.scenarioCompatibility === "object") {
    return model.scenarioCompatibility.compatible === true;
  }

  const evalCompat = getEvaluationCompatibilityFlag(model);
  const domainCompat = model?.compatibility?.domain;
  const consensusCompatible = model?.supportsConsensus !== true;

  if (evalCompat === false) return false;
  if (domainCompat === false) return false;
  if (!consensusCompatible) return false;

  return true;
};

export const getCompatReason = (model, domainType) => {
  if (model?.scenarioCompatibility && typeof model.scenarioCompatibility === "object") {
    const reasons = Array.isArray(model.scenarioCompatibility.reasons)
      ? model.scenarioCompatibility.reasons.filter(Boolean)
      : [];
    return reasons.join(" · ");
  }

  const reasons = [];
  const evalCompat = getEvaluationCompatibilityFlag(model);

  if (evalCompat === false) reasons.push("Evaluation structure mismatch");
  if (model?.compatibility?.domain === false) {
    reasons.push(domainType ? `No ${domainType} support` : "Domain not supported");
  }
  if (model?.supportsConsensus === true) {
    reasons.push("Consensus scenarios are not supported");
  }

  return reasons.join(" · ");
};
