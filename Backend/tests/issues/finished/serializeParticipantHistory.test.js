import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { serializeParticipantHistory } from "../../../modules/issues/finished/finishedPayload/serializers/serializeParticipantHistory.js";

describe("serializeParticipantHistory", () => {
  it("retains submitted participation for an expert removed before computation", () => {
    const expertId = new mongoose.Types.ObjectId();
    const expert = {
      _id: expertId,
      name: "Test 1",
      email: "test-1@example.test",
    };

    const result = serializeParticipantHistory({
      participations: [],
      exitUsers: [{ user: expert, hidden: true }],
      evaluations: [],
      evaluationRevisions: [{
        expert,
        stage: "alternativeEvaluation",
        consensusPhase: 0,
        action: "submitted",
      }],
      phaseResults: [],
    });

    expect(result).toMatchObject({
      summary: { total: 1, participated: 1, notParticipated: 0 },
      records: [{
        expert: { id: String(expertId), name: "Test 1" },
        participated: true,
        participationKey: "participated",
      }],
    });
  });
});
