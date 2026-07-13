import { describe, expect, it } from "vitest";

import {
  buildExpertWeightSnapshotOrThrow,
  validateAndNormalizeExpertWeightsOrThrow,
} from "../../../modules/issues/shared/expertWeights.js";

const weightedModel = { usesExpertWeights: true };
const unweightedModel = { usesExpertWeights: false };

describe("expert weights", () => {
  it("requires one valid weight for every final expert", () => {
    expect(
      validateAndNormalizeExpertWeightsOrThrow({
        model: weightedModel,
        expertEmails: ["a@example.com", "b@example.com"],
        expertWeightsByEmail: { "a@example.com": 0.4, "b@example.com": 0.6 },
      })
    ).toEqual({ "a@example.com": 0.4, "b@example.com": 0.6 });

    expect(() =>
      validateAndNormalizeExpertWeightsOrThrow({
        model: weightedModel,
        expertEmails: ["a@example.com", "b@example.com"],
        expertWeightsByEmail: { "a@example.com": 1 },
      })
    ).toThrow(/required/);
  });

  it("rejects invalid totals and weights for models that do not use them", () => {
    expect(() =>
      validateAndNormalizeExpertWeightsOrThrow({
        model: weightedModel,
        expertEmails: ["a@example.com", "b@example.com"],
        expertWeightsByEmail: { "a@example.com": 0.2, "b@example.com": 0.2 },
      })
    ).toThrow(/sum to 1/);

    expect(() =>
      validateAndNormalizeExpertWeightsOrThrow({
        model: unweightedModel,
        expertEmails: ["a@example.com"],
        expertWeightsByEmail: { "a@example.com": 1 },
      })
    ).toThrow(/not supported/);
  });

  it("builds a deterministic immutable snapshot from the participating experts", () => {
    const result = buildExpertWeightSnapshotOrThrow({
      model: weightedModel,
      participations: [
        { expert: { _id: "expert-b", email: "b@example.com" }, weight: 0.6 },
        { expert: { _id: "expert-a", email: "a@example.com" }, weight: 0.4 },
      ],
    });

    expect(result.snapshot).toEqual([
      { expert: "expert-a", weight: 0.4 },
      { expert: "expert-b", weight: 0.6 },
    ]);
    expect(result.weightsByExpertId.get("expert-a")).toBe(0.4);
  });
});
