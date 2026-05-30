export const isFinishedIssue = (issue) =>
  issue?.currentStage === "finished" && issue?.active === false;

export const supportsFinishedPayload = (issue) => {
  if (!isFinishedIssue(issue)) {
    return false;
  }

  const structureKey = issue?.alternativeEvaluationStructureKey;
  return (
    structureKey === "alternativeCriteriaMatrix" ||
    structureKey === "alternativePairwiseByCriterion"
  );
};
