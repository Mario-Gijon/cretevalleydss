import { getEvaluationStructureOrThrow } from "../../../decisionPlugins/evaluations/evaluationStructureRegistry.js";

export const isFinishedIssue = (issue) =>
  issue?.currentStage === "finished" && issue?.active === false;

export const supportsFinishedPayload = (issue) => {
  if (!isFinishedIssue(issue)) {
    return false;
  }

  try {
    const structure = getEvaluationStructureOrThrow(
      issue?.alternativeEvaluationStructureKey
    );
    return typeof structure?.get === "function";
  } catch {
    return false;
  }
};
