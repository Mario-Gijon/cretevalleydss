import { describe, expect, it } from "vitest";

import { IssueEvent } from "../../../models/IssueEvents.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { createIssueParticipationsAndNotifications } from "../../../modules/issues/creation/createIssueParticipants.js";
import { ISSUE_EVENT_TYPES, writeIssueEvent } from "../../../modules/issues/events/index.js";
import { leaveActiveIssueWorkflow } from "../../../modules/issues/lifecycle/issueLifecycleWorkflows.js";
import { deleteIssueCascade } from "../../../modules/issues/lifecycle/deleteIssueCascade.js";
import { respondToIssueInvitationWorkflow } from "../../../modules/issues/notifications/respondToIssueInvitationWorkflow.js";
import { editIssueExpertsWorkflow } from "../../../modules/issues/participants/editIssueExpertsWorkflow.js";
import {
  createConfirmedUser,
  createIssueCriteriaFixture,
  createIssueFixture,
  createIssueModel,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const loadEvents = (issueId) =>
  IssueEvent.find({ issue: issueId }).sort({ occurredAt: 1, _id: 1 }).lean();

describe("IssueEvent journal", () => {
  it("records initial participation and invitation facts with one creation correlation", async () => {
    const owner = await createConfirmedUser({ email: "owner@example.com" });
    const expert = await createConfirmedUser({ email: "expert@example.com" });
    const issue = await createIssueFixture({ ownerId: owner._id, createdBy: owner._id });
    const occurredAt = new Date("2026-01-01T10:00:00.000Z");

    await createIssueParticipationsAndNotifications({
      issue,
      input: {
        uniqueExpertEmails: [owner.email, expert.email],
        issueName: issue.name,
        issueDescription: issue.description,
      },
      expertByEmail: new Map([
        [owner.email, owner],
        [expert.email, expert],
      ]),
      owner,
      ownerEmail: owner.email,
      isCriteriaWeightingRequired: false,
      normalizedExpertWeightsByEmail: null,
      correlationId: "creation-correlation",
      occurredAt,
    });

    const events = await loadEvents(issue._id);
    const byType = events.reduce((result, event) => {
      result[event.eventType] = [...(result[event.eventType] || []), event];
      return result;
    }, {});

    expect(events).toHaveLength(4);
    expect(byType[ISSUE_EVENT_TYPES.PARTICIPATION_CREATED]).toHaveLength(2);
    expect(byType[ISSUE_EVENT_TYPES.PARTICIPATION_ENTERED]).toHaveLength(1);
    expect(byType[ISSUE_EVENT_TYPES.INVITATION_CREATED]).toHaveLength(1);
    expect(events.every((event) => event.correlationId === "creation-correlation")).toBe(true);
    expect(byType[ISSUE_EVENT_TYPES.PARTICIPATION_ENTERED][0]).toMatchObject({
      actorUser: owner._id,
      subjectUser: owner._id,
      details: { initialIssueCreation: true },
    });
    expect(byType[ISSUE_EVENT_TYPES.INVITATION_CREATED][0]).toMatchObject({
      subjectUser: expert._id,
      details: {
        initialIssueCreation: true,
        initialInvitationStatus: "pending",
      },
    });
  });

  it("records acceptance, repeated acceptance, decline, and re-entry without inventing a leave", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const issue = await createIssueFixture({ ownerId: owner._id });
    const participation = await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "pending",
    });

    await respondToIssueInvitationWorkflow({ issueId: issue._id, userId: expert._id, action: "accepted" });
    const acceptedParticipation = await Participation.findById(participation._id).lean();
    await respondToIssueInvitationWorkflow({ issueId: issue._id, userId: expert._id, action: "accepted" });
    await respondToIssueInvitationWorkflow({ issueId: issue._id, userId: expert._id, action: "declined" });
    await respondToIssueInvitationWorkflow({ issueId: issue._id, userId: expert._id, action: "accepted" });

    const events = await loadEvents(issue._id);
    expect(events.map((event) => event.eventType)).toEqual([
      "invitation.accepted",
      "participation.entered",
      "invitation.accepted",
      "invitation.declined",
      "invitation.accepted",
      "participation.entered",
    ]);
    expect(events.filter((event) => event.eventType === "participation.left")).toHaveLength(0);
    expect(events[0].previousState.invitationStatus).toBe("pending");
    expect(events[0].nextState.invitationStatus).toBe("accepted");
    expect(events[0].correlationId).toBe(events[1].correlationId);
    expect(events[0].occurredAt.getTime()).toBe(events[1].occurredAt.getTime());
    expect(acceptedParticipation.joinedAt.getTime()).toBe(events[0].occurredAt.getTime());
  });

  it("retains a voluntary-leave event after participation cleanup", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const issue = await createIssueFixture({ ownerId: owner._id });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryStage: "criteriaWeighting",
      entryPhase: 0,
    });

    await leaveActiveIssueWorkflow({ issueId: issue._id, userId: expert._id });

    expect(await Participation.findOne({ issue: issue._id, expert: expert._id })).toBeNull();
    const [event] = await loadEvents(issue._id);
    expect(event).toMatchObject({
      eventType: "participation.left",
      actorUser: expert._id,
      subjectUser: expert._id,
      nextState: null,
    });
    expect(event.previousState).toMatchObject({ invitationStatus: "accepted" });
  });

  it("records owner removal with a truthful actor and preserved pre-delete state", async () => {
    const owner = await createConfirmedUser({ email: "owner@example.com" });
    const expert = await createConfirmedUser({ email: "expert@example.com" });
    const issue = await createIssueFixture({ ownerId: owner._id });
    await createIssueCriteriaFixture({ issueId: issue._id, leafNames: ["Only leaf"] });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: owner._id,
      invitationStatus: "accepted",
      entryStage: "criteriaWeighting",
      entryPhase: 0,
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryStage: "criteriaWeighting",
      entryPhase: 0,
    });

    await editIssueExpertsWorkflow({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: [expert.email],
      expertWeightsByEmail: null,
      hasExpertWeightsByEmail: false,
      sendInvitationEmail: async () => {},
    });

    expect(await Participation.findOne({ issue: issue._id, expert: expert._id })).toBeNull();
    const [event] = await loadEvents(issue._id);
    expect(event).toMatchObject({
      eventType: "participation.removed",
      actorType: "user",
      actorUser: owner._id,
      subjectUser: expert._id,
      nextState: null,
      reason: "Expelled by owner",
    });
    expect(event.previousState).toMatchObject({ invitationStatus: "accepted" });
  });

  it("records one participant-edit weight-vector change and no event for an unchanged edit", async () => {
    const owner = await createConfirmedUser({ email: "owner@example.com" });
    const existingExpert = await createConfirmedUser({ email: "existing@example.com" });
    const addedExpert = await createConfirmedUser({ email: "added@example.com" });
    const model = await createIssueModel({ usesExpertWeights: true });
    const issue = await createIssueFixture({ ownerId: owner._id, model: model._id });
    await createIssueCriteriaFixture({ issueId: issue._id, leafNames: ["Only leaf"] });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: existingExpert._id,
      invitationStatus: "accepted",
      weight: 1,
    });

    await editIssueExpertsWorkflow({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [addedExpert.email],
      expertsToRemove: [],
      expertWeightsByEmail: {
        [existingExpert.email]: 0.4,
        [addedExpert.email]: 0.6,
      },
      hasExpertWeightsByEmail: true,
      sendInvitationEmail: async () => {},
    });

    const weightEvents = await IssueEvent.find({
      issue: issue._id,
      eventType: "expertWeights.changed",
    }).lean();
    expect(weightEvents).toHaveLength(1);
    expect(weightEvents[0]).toMatchObject({
      actorUser: owner._id,
      stage: "criteriaWeighting",
      phase: 0,
      details: { cause: "participantEdit" },
      previousState: { weightsByExpertId: { [String(existingExpert._id)]: 1 } },
      nextState: {
        weightsByExpertId: {
          [String(addedExpert._id)]: 0.6,
          [String(existingExpert._id)]: 0.4,
        },
      },
    });
    expect(
      await IssueEvent.countDocuments({ issue: issue._id, eventType: "participation.entered" })
    ).toBe(0);

    await editIssueExpertsWorkflow({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: [],
      expertWeightsByEmail: null,
      hasExpertWeightsByEmail: false,
      sendInvitationEmail: async () => {},
    });
    expect(await IssueEvent.countDocuments({ issue: issue._id, eventType: "expertWeights.changed" })).toBe(1);
  });

  it("deletes journal records only with the whole Issue aggregate", async () => {
    const owner = await createConfirmedUser();
    const issue = await createIssueFixture({ ownerId: owner._id });
    await writeIssueEvent({
      issueId: issue._id,
      eventType: "participation.created",
      actorType: "user",
      actorUser: owner._id,
      subjectUser: owner._id,
      occurredAt: new Date(),
      correlationId: "cascade-event",
      details: {},
    });

    await deleteIssueCascade({ issueId: issue._id });
    expect(await IssueEvent.countDocuments({ issue: issue._id })).toBe(0);
    expect(await Notification.countDocuments({ issue: issue._id })).toBe(0);
  });
});
