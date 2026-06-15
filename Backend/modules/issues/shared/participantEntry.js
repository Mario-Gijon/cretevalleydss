import { ISSUE_STAGES } from "../../decisionPlugins/evaluations/evaluation.constants.js";

export const PARTICIPATION_ENTRY_STAGES = Object.freeze({
  CRITERIA_WEIGHTING: "criteriaWeighting",
  ALTERNATIVE_EVALUATION: "alternativeEvaluation",
});

export const resolveParticipationEntryStage = (issueStage) => {
  if (
    issueStage === ISSUE_STAGES.CRITERIA_WEIGHTING ||
    issueStage === ISSUE_STAGES.WEIGHTS_FINISHED
  ) {
    return PARTICIPATION_ENTRY_STAGES.CRITERIA_WEIGHTING;
  }

  if (
    issueStage === ISSUE_STAGES.ALTERNATIVE_EVALUATION ||
    issueStage === ISSUE_STAGES.FINISHED
  ) {
    return PARTICIPATION_ENTRY_STAGES.ALTERNATIVE_EVALUATION;
  }

  return null;
};

export const resolveParticipationEntryPhase = (issue) =>
  Number.isInteger(issue?.consensusPhase) ? issue.consensusPhase : null;

export const buildParticipationEntryMetadata = ({ issue }) => ({
  joinedAt: new Date(),
  entryPhase: resolveParticipationEntryPhase(issue),
  entryStage: resolveParticipationEntryStage(issue?.currentStage),
});

export const isSingleLeafCriterionCount = (leafCriteriaCount) =>
  leafCriteriaCount === 1;
