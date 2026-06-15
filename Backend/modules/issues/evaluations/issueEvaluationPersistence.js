import { IssueEvaluation } from "../../../models/IssueEvaluations.js";

export const findStoredEvaluation = async ({
  issueId,
  userId,
  stage,
  consensusPhase,
  session = null,
}) => {
  return IssueEvaluation.findOne({
    issue: issueId,
    expert: userId,
    stage,
    consensusPhase,
  }).session(session);
};

export const upsertIssueEvaluation = async ({
  issueId,
  userId,
  stage,
  consensusPhase,
  payload,
  completed,
  submittedAt,
  session = null,
}) => {
  return IssueEvaluation.findOneAndUpdate(
    {
      issue: issueId,
      expert: userId,
      stage,
      consensusPhase,
    },
    {
      $set: {
        payload,
        completed,
        submittedAt,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      session,
    }
  );
};
