import { User } from "../../../models/Users.js";
import { Participation } from "../../../models/Participations.js";

import { normalizeEmail } from "../../../utils/common/strings.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
import {
  addExpertsToActiveIssue,
  removeExpertsFromActiveIssue,
} from "./applyParticipantEdition.js";
import {
  loadParticipantEditionContext,
  normalizeParticipantEditionRequest,
} from "./loadParticipantEditionContext.js";
import {
  modelUsesExpertWeights,
  validateAndNormalizeExpertWeightsOrThrow,
} from "../shared/expertWeights.js";
import {
  createIssueEventOperationMetadata,
  ISSUE_EVENT_TYPES,
  writeIssueEvent,
} from "../events/index.js";
import { toIdString } from "../../../utils/common/ids.js";

const buildWeightsByExpertId = (participations) =>
  Object.fromEntries(
    [...participations]
      .map((participation) => [
        toIdString(participation?.expert?._id || participation?.expert),
        typeof participation?.weight === "number" && Number.isFinite(participation.weight)
          ? participation.weight
          : null,
      ])
      .filter(([expertId]) => Boolean(expertId))
      .sort(([left], [right]) => left.localeCompare(right))
  );

const sameWeightVectors = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const getParticipationEmailOrThrow = ({ participation, issueId }) => {
  const email = normalizeEmail(participation?.expert?.email);

  if (!email) {
    throw createInternalError("Participation expert email is invalid", {
      field: "participations.expert.email",
      details: { issueId },
    });
  }

  return email;
};

export const editIssueExperts = async ({
  issueId,
  userId,
  actorUserId = userId,
  expertsToAdd,
  expertsToRemove,
  expertWeightsByEmail = null,
  hasExpertWeightsByEmail = false,
  correlationId = null,
  occurredAt = null,
  session = null,
}) => {
  const {
    finalExpertsToAdd,
    finalExpertsToRemove,
  } = normalizeParticipantEditionRequest({
    expertsToAdd,
    expertsToRemove,
  });

  const context = await loadParticipantEditionContext({
    issueId,
    userId,
    session,
  });
  const eventMetadata =
    correlationId && occurredAt
      ? { correlationId, occurredAt }
      : createIssueEventOperationMetadata();

  if (finalExpertsToRemove.includes(normalizeEmail(context.owner.email))) {
    throw createBadRequestError("Issue owner cannot be removed", {
      field: "expertsToRemove",
    });
  }

  const currentParticipations = await Participation.find({
    issue: context.issue._id,
  })
    .populate("expert", "email")
    .session(session);
  const participationByEmail = new Map();
  const previousWeightsByExpertId = buildWeightsByExpertId(currentParticipations);

  for (const participation of currentParticipations) {
    const email = getParticipationEmailOrThrow({
      participation,
      issueId: context.issue._id,
    });

    if (participationByEmail.has(email)) {
      throw createInternalError("Issue has duplicate participant emails", {
        field: "participations",
        details: { issueId: context.issue._id, email },
      });
    }

    participationByEmail.set(email, participation);
  }

  const allEmailsToFetch = Array.from(
    new Set([...finalExpertsToAdd, ...finalExpertsToRemove])
  );

  const users = allEmailsToFetch.length
    ? await User.find({ email: { $in: allEmailsToFetch } }).session(session).lean()
    : [];

  const userByEmail = new Map(
    users.map((user) => [normalizeEmail(user.email), user])
  );

  const actualExpertsToRemove = finalExpertsToRemove.filter((email) =>
    participationByEmail.has(email)
  );
  const actualExpertsToAdd = finalExpertsToAdd.filter(
    (email) => !participationByEmail.has(email) && userByEmail.has(email)
  );
  const removeSet = new Set(actualExpertsToRemove);
  const finalExpertEmails = [
    ...Array.from(participationByEmail.keys()).filter(
      (email) => !removeSet.has(email)
    ),
    ...actualExpertsToAdd,
  ].sort();

  if (finalExpertEmails.length === 0) {
    throw createBadRequestError("An issue must have at least one expert.", {
      field: "expertsToRemove",
    });
  }

  const expertSetChanged =
    actualExpertsToAdd.length > 0 || actualExpertsToRemove.length > 0;
  let normalizedExpertWeightsByEmail = null;

  if (modelUsesExpertWeights(context.issue.model)) {
    if (expertSetChanged) {
      normalizedExpertWeightsByEmail = validateAndNormalizeExpertWeightsOrThrow({
        model: context.issue.model,
        expertEmails: finalExpertEmails,
        expertWeightsByEmail,
      });
    }
  } else if (hasExpertWeightsByEmail) {
    throw createBadRequestError("Expert weights are not supported by this model.", {
      field: "expertWeightsByEmail",
    });
  }

  const invitationEmailsToSend = await addExpertsToActiveIssue({
    issue: context.issue,
    owner: context.owner,
    userId,
    actorUserId,
    expertEmails: actualExpertsToAdd,
    userByEmail,
    leafCriteria: context.leafCriteria,
    currentPhase: context.currentPhase,
    stageForLog: context.stageForLog,
    expertWeightsByEmail: normalizedExpertWeightsByEmail,
    correlationId: eventMetadata.correlationId,
    occurredAt: eventMetadata.occurredAt,
    session,
  });

  await removeExpertsFromActiveIssue({
    issue: context.issue,
    actorUserId,
    expertEmails: actualExpertsToRemove,
    userByEmail,
    currentPhase: context.currentPhase,
    stageForLog: context.stageForLog,
    correlationId: eventMetadata.correlationId,
    occurredAt: eventMetadata.occurredAt,
    session,
  });

  if (normalizedExpertWeightsByEmail) {
    const operations = finalExpertEmails.map((email) => {
      const existingParticipation = participationByEmail.get(email);
      const expertId = existingParticipation?.expert?._id || userByEmail.get(email)?._id;

      if (!expertId) {
        throw createInternalError("Final expert is missing a user id", {
          field: "expertWeightsByEmail",
          details: { issueId: context.issue._id, email },
        });
      }

      return {
        updateOne: {
          filter: { issue: context.issue._id, expert: expertId },
          update: { $set: { weight: normalizedExpertWeightsByEmail[email] } },
        },
      };
    });

    await Participation.bulkWrite(operations, { session });

    const finalParticipations = await Participation.find({
      issue: context.issue._id,
    }).session(session);
    const nextWeightsByExpertId = buildWeightsByExpertId(finalParticipations);

    if (!sameWeightVectors(previousWeightsByExpertId, nextWeightsByExpertId)) {
      await writeIssueEvent({
        issueId: context.issue._id,
        eventType: ISSUE_EVENT_TYPES.EXPERT_WEIGHTS_CHANGED,
        actorType: "user",
        actorUser: actorUserId,
        stage: context.stageForLog,
        phase: context.currentPhase,
        occurredAt: eventMetadata.occurredAt,
        correlationId: eventMetadata.correlationId,
        previousState: { weightsByExpertId: previousWeightsByExpertId },
        nextState: { weightsByExpertId: nextWeightsByExpertId },
        details: { cause: "participantEdit" },
        session,
      });
    }
  }

  return {
    issueName: context.issue.name,
    invitationEmailsToSend: invitationEmailsToSend.map((expertEmail) => ({
      expertEmail,
      issueName: context.issue.name,
      issueDescription: context.issue.description,
      ownerEmail: context.owner.email,
    })),
  };
};
