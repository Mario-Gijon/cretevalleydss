export const mapIssueStageToExitStage = (stage) => {
  if (stage === "criteriaWeighting" || stage === "weightsFinished") {
    return "criteriaWeighting";
  }

  if (stage === "alternativeEvaluation") {
    return "alternativeEvaluation";
  }

  return null;
};
