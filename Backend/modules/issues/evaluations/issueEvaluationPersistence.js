import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueEvaluationRevision } from "../../../models/IssueEvaluationRevisions.js";

export const cloneSerializable = (value) => JSON.parse(JSON.stringify(value));

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

const findLatestRevision = async ({
  issueId,
  userId,
  stage,
  consensusPhase,
  session = null,
}) => {
  return IssueEvaluationRevision.findOne({
    issue: issueId,
    expert: userId,
    stage,
    consensusPhase,
  })
    .sort({ occurredAt: -1, _id: -1 })
    .session(session);
};

/**
 * Persists one user evaluation operation. The IssueEvaluation remains the
 * mutable projection while IssueEvaluationRevision is immutable evidence for
 * this exact operation. Callers that require atomicity must provide a Mongo
 * transaction session.
 */
export const persistIssueEvaluationOperation = async ({
  issueId,
  userId,
  actorId,
  actorType = "user",
  sourceExecutionAttempt = null,
  stage,
  consensusPhase,
  action,
  structureKey,
  rawPayload,
  normalizedPayload,
  decisionContext,
  completed,
  submittedAt,
  occurredAt,
  correlationId,
  session = null,
}) => {
  const evaluation = await upsertIssueEvaluation({
    issueId,
    userId,
    stage,
    consensusPhase,
    payload: normalizedPayload,
    completed,
    submittedAt,
    session,
  });

  const previousRevision = await findLatestRevision({
    issueId,
    userId,
    stage,
    consensusPhase,
    session,
  });

  const [revision] = await IssueEvaluationRevision.create(
    [
      {
        issue: issueId,
        evaluation: evaluation._id,
        expert: userId,
        actorType,
        actorUser: actorType === "user" ? actorId : null,
        stage,
        consensusPhase,
        action,
        structureKey,
        rawPayload: cloneSerializable(rawPayload),
        normalizedPayload: cloneSerializable(normalizedPayload),
        decisionContext: cloneSerializable(decisionContext),
        previousRevision: previousRevision?._id ?? null,
        submittedAt,
        occurredAt,
        correlationId,
        sourceExecutionAttempt,
        schemaVersion: 1,
      },
    ],
    { session }
  );

  return {
    evaluation,
    revision,
  };
};
