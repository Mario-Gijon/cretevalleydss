import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";
import { getIssueByIdOrThrow } from "../issue.queries.js";
import {
  createBadRequestError,
  createForbiddenError,
} from "../../../utils/common/errors.js";
import {
  EVALUATION_STAGES,
  ISSUE_STAGES,
} from "./evaluation.constants.js";
import { getEvaluationStructureOrThrow } from "./evaluation.registry.js";
import { isPlainObject } from "../../../utils/common/objects.js";

const getStructureForIssueStage = ({ issue, stage }) => {
  const structureKeyByStage = {
    [EVALUATION_STAGES.CRITERIA_WEIGHTING]:
      issue.criteriaWeightingStructureKey,
    [EVALUATION_STAGES.ALTERNATIVE_EVALUATION]:
      issue.alternativeEvaluationStructureKey,
  };

  return getEvaluationStructureOrThrow(structureKeyByStage[stage]);
};

const loadPreviousCollectiveReference = async ({ issue, stage }) => {
  if (stage !== EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    return null;
  }

  const currentConsensusPhase = Number(issue?.consensusPhase);
  if (!Number.isInteger(currentConsensusPhase) || currentConsensusPhase <= 1) {
    return null;
  }

  const previousConsensusPhase = currentConsensusPhase - 1;
  const previousStageResult = await IssueStageResult.findOne({
    issue: issue?._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    consensusPhase: previousConsensusPhase,
  }).lean();

  if (!previousStageResult) {
    return null;
  }

  return {
    consensusPhase: previousConsensusPhase,
    collectiveEvaluations: isPlainObject(previousStageResult.collectiveEvaluations)
      ? previousStageResult.collectiveEvaluations
      : {},
  };
};

const requireAcceptedParticipation = async ({ issueId, userId }) => {
  const participation = await Participation.findOne({
    issue: issueId,
    expert: userId,
    invitationStatus: "accepted",
  });

  if (!participation) {
    throw createForbiddenError(
      "You are not an accepted participant for this issue",
      {
        field: "userId",
      }
    );
  }
};

const loadEvaluationContext = async ({ issueId, userId, stage }) => {
  const issue = await getIssueByIdOrThrow(issueId, { lean: false });

  if (issue.currentStage !== stage) {
    throw createBadRequestError(
      `Issue is not currently accepting '${stage}' evaluations`,
      {
        code: "ISSUE_STAGE_NOT_ACCEPTING_EVALUATIONS",
        field: "stage",
        details: {
          currentStage: issue.currentStage,
          requestedStage: stage,
        },
      }
    );
  }

  await requireAcceptedParticipation({
    issueId: issue._id,
    userId,
  });

  return {
    issue,
    structure: getStructureForIssueStage({ issue, stage }),
  };
};


const findStoredEvaluation = async ({
  issueId,
  userId,
  stage,
  consensusPhase,
}) => {
  return IssueEvaluation.findOne({
    issue: issueId,
    expert: userId,
    stage,
    consensusPhase,
  });
};

const upsertIssueEvaluation = async ({
  issueId,
  userId,
  stage,
  consensusPhase,
  payload,
  completed,
  submittedAt,
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
    }
  );
};

const markParticipationCompleted = async ({ issueId, userId, stage }) => {
  const completionUpdate =
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
      ? { weightsCompleted: true }
      : { evaluationCompleted: true };

  const updatedParticipation = await Participation.findOneAndUpdate(
    {
      issue: issueId,
      expert: userId,
      invitationStatus: "accepted",
    },
    {
      $set: completionUpdate,
    },
    {
      new: true,
    }
  );

  if (!updatedParticipation) {
    throw createForbiddenError(
      "You are no longer an accepted participant for this issue",
      {
        field: "userId",
      }
    );
  }
};

const advanceToWeightsFinishedAfterSubmit = async ({ issue, stage }) => {
  if (stage !== EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    return;
  }

  const participations = await Participation.find({
    issue: issue._id,
  })
    .select("expert invitationStatus weightsCompleted")
    .lean();

  const pendingParticipations = participations.filter(
    (participation) => participation.invitationStatus === "pending"
  );
  if (pendingParticipations.length > 0) {
    return;
  }

  const acceptedParticipations = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );
  if (acceptedParticipations.length === 0) {
    return;
  }

  const allWeightsCompleted = acceptedParticipations.every(
    (participation) => participation.weightsCompleted === true
  );

  if (
    allWeightsCompleted &&
    issue.currentStage === ISSUE_STAGES.CRITERIA_WEIGHTING
  ) {
    issue.currentStage = ISSUE_STAGES.WEIGHTS_FINISHED;
    await issue.save();
  }
};


export const getIssueEvaluationPayload = async ({ issueId, userId, stage }) => {
  const { issue, structure } = await loadEvaluationContext({
    issueId,
    userId,
    stage,
  });

  const storedEvaluation = await findStoredEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
  });

  const payload = await structure.get({
    storedEvaluation,
    issueId: issue._id,
    userId,
    issue,
    phase: issue.consensusPhase,
  });

  const collectiveReference = await loadPreviousCollectiveReference({
    issue,
    stage,
  });

  return {
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    payload,
    collectiveReference,
    completed: storedEvaluation?.completed ?? false,
    submittedAt: storedEvaluation?.submittedAt ?? null,
  };
};

export const saveIssueEvaluationDraft = async ({
  issueId,
  userId,
  stage,
  payload,
}) => {
  const { issue, structure } = await loadEvaluationContext({
    issueId,
    userId,
    stage,
  });

  const normalizedPayload = await structure.save({
    mode: "draft",
    payload,
    issueId: issue._id,
    userId,
    issue,
    phase: issue.consensusPhase,
  });

  await upsertIssueEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
    payload: normalizedPayload,
    completed: false,
    submittedAt: null,
  });

  return {
    message: "Evaluation draft saved successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    completed: false,
  };
};

export const submitIssueEvaluation = async ({
  issueId,
  userId,
  stage,
  payload,
}) => {
  const { issue, structure } = await loadEvaluationContext({
    issueId,
    userId,
    stage,
  });

  const normalizedPayload = await structure.save({
    mode: "submit",
    payload,
    issueId: issue._id,
    userId,
    issue,
    phase: issue.consensusPhase,
  });

  await upsertIssueEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
    payload: normalizedPayload,
    completed: true,
    submittedAt: new Date(),
  });

  await markParticipationCompleted({
    issueId: issue._id,
    userId,
    stage,
  });

  await advanceToWeightsFinishedAfterSubmit({ issue, stage });

  return {
    message: "Evaluation submitted successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    completed: true,
    currentStage: issue.currentStage,
  };
};
