import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { serializeEvaluationParticipation } from "../../../modules/issues/finished/finishedPayload/serializers/serializeEvaluationParticipation.js";

const id = () => new mongoose.Types.ObjectId();

const event = (subjectUser, overrides = {}) => ({
  subjectUser,
  eventType: "participation.entered",
  stage: "alternativeEvaluation",
  phase: 0,
  occurredAt: "2026-01-10T10:00:00.000Z",
  ...overrides,
});

describe("serializeEvaluationParticipation", () => {
  it("serializes a populated expert identity", () => {
    const expertId = id();
    const result = serializeEvaluationParticipation({
      participations: [
        {
          expert: {
            _id: expertId,
            name: "Ada Lovelace",
            email: "ada@example.test",
            university: "Analytical University",
          },
          invitationStatus: "accepted",
        },
      ],
    });

    expect(result.experts).toEqual([
      expect.objectContaining({
        expertId: String(expertId),
        name: "Ada Lovelace",
        email: "ada@example.test",
        university: "Analytical University",
      }),
    ]);
  });

  it("includes an event-only expert with a populated subject user", () => {
    const expertId = id();
    const result = serializeEvaluationParticipation({
      issueEvents: [
        event({
          _id: expertId,
          name: "Grace Hopper",
          email: "grace@example.test",
          university: "Compiler University",
        }),
      ],
    });

    expect(result.experts).toEqual([
      expect.objectContaining({
        expertId: String(expertId),
        name: "Grace Hopper",
      }),
    ]);
  });

  it("does not throw for an expert with an incomplete identity", () => {
    const expertId = id();

    expect(() =>
      serializeEvaluationParticipation({
        issueEvents: [event(expertId)],
      })
    ).not.toThrow();

    expect(
      serializeEvaluationParticipation({ issueEvents: [event(expertId)] }).experts[0]
    ).toMatchObject({
      expertId: String(expertId),
      name: null,
      email: null,
      university: null,
    });
  });

  it("retains a removed expert's submitted evaluation from immutable revision evidence", () => {
    const expertId = id();
    const result = serializeEvaluationParticipation({
      evaluationRevisions: [
        {
          expert: { _id: expertId, name: "Test 1" },
          stage: "alternativeEvaluation",
          consensusPhase: 0,
          action: "submitted",
          submittedAt: "2026-01-10T10:00:00.000Z",
        },
      ],
      issueEvents: [
        event({ _id: expertId, name: "Test 1" }, {
          eventType: "participation.removed",
          occurredAt: "2026-01-10T11:00:00.000Z",
        }),
      ],
    });

    expect(result.stagePhases.alternativeEvaluation).toEqual([0]);
    expect(result.experts).toEqual([
      expect.objectContaining({
        expertId: String(expertId),
        name: "Test 1",
        alternativeEvaluation: {
          submissions: [{
            phase: 0,
            completed: true,
            submittedAt: "2026-01-10T10:00:00.000Z",
          }],
        },
        participationEvents: [
          expect.objectContaining({ type: "removed" }),
        ],
      }),
    ]);
  });

  it("sorts mixed complete and incomplete identities deterministically", () => {
    const namedExpertId = id();
    const unnamedExpertId = id();
    const result = serializeEvaluationParticipation({
      participations: [
        { expert: unnamedExpertId, invitationStatus: "accepted" },
        { expert: { _id: namedExpertId, name: "Zoe" }, invitationStatus: "accepted" },
      ],
    });

    expect(result.experts.map((expert) => expert.expertId)).toEqual([
      String(unnamedExpertId),
      String(namedExpertId),
    ]);
  });
});
