import { describe, expect, it } from "vitest";

import {
  buildEqualExpertWeights,
  modelUsesExpertWeights,
  syncExpertWeightsForSelection,
  validateExpertWeights,
} from "../../../src/features/createIssue/logic/createIssueExpertWeights.js";

describe("createIssueExpertWeights", () => {
  it("detects when a model uses expert weights", () => {
    expect(modelUsesExpertWeights({ usesExpertWeights: true })).toBe(true);
    expect(modelUsesExpertWeights({ usesExpertWeights: false })).toBe(false);
    expect(modelUsesExpertWeights(null)).toBe(false);
  });

  it("initializes equal weights for the selected experts", () => {
    expect(buildEqualExpertWeights(["a@example.com", "b@example.com"])).toEqual({
      "a@example.com": 0.5,
      "b@example.com": 0.5,
    });
  });

  it("adds a weight entry for new experts and removes stale ones", () => {
    expect(
      syncExpertWeightsForSelection({
        expertEmails: ["a@example.com", "b@example.com", "c@example.com"],
        previousExpertWeights: {
          "a@example.com": 0.7,
          "b@example.com": 0.3,
        },
        preserveCustomWeights: true,
      })
    ).toEqual({
      "a@example.com": 0.7,
      "b@example.com": 0.3,
      "c@example.com": 0,
    });

    expect(
      syncExpertWeightsForSelection({
        expertEmails: ["a@example.com"],
        previousExpertWeights: {
          "a@example.com": 0.7,
          "b@example.com": 0.3,
        },
        preserveCustomWeights: true,
      })
    ).toEqual({
      "a@example.com": 0.7,
    });
  });

  it("preserves custom weights when requested", () => {
    expect(
      syncExpertWeightsForSelection({
        expertEmails: ["a@example.com", "b@example.com"],
        previousExpertWeights: {
          "a@example.com": 0.8,
          "b@example.com": 0.2,
        },
        preserveCustomWeights: true,
      })
    ).toEqual({
      "a@example.com": 0.8,
      "b@example.com": 0.2,
    });
  });

  it("rejects missing, non-numeric, negative, and invalid-sum weights", () => {
    expect(
      validateExpertWeights({
        expertEmails: ["a@example.com"],
        expertWeights: null,
      })
    ).toMatchObject({
      valid: false,
      message: "Expert weights are required for this model.",
    });

    expect(
      validateExpertWeights({
        expertEmails: ["a@example.com"],
        expertWeights: { "a@example.com": "bad" },
      })
    ).toMatchObject({
      valid: false,
      message: "Expert weights are required for this model.",
    });

    expect(
      validateExpertWeights({
        expertEmails: ["a@example.com", "b@example.com"],
        expertWeights: {
          "a@example.com": -0.2,
          "b@example.com": 1.2,
        },
      })
    ).toMatchObject({
      valid: false,
      message: "Expert weights must be between 0 and 1.",
    });

    expect(
      validateExpertWeights({
        expertEmails: ["a@example.com", "b@example.com"],
        expertWeights: {
          "a@example.com": 0.2,
          "b@example.com": 0.2,
        },
      })
    ).toMatchObject({
      valid: false,
      message: "Expert weights must sum to 1.",
    });
  });

  it("accepts valid expert weights", () => {
    expect(
      validateExpertWeights({
        expertEmails: ["a@example.com", "b@example.com"],
        expertWeights: {
          "a@example.com": 0.6,
          "b@example.com": 0.4,
        },
      })
    ).toMatchObject({
      valid: true,
      message: "Expert weights are valid.",
    });
  });
});
