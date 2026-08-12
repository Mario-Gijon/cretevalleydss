import { describe, expect, it } from "vitest";

import { linguistic2Tuple } from "../../modules/expressionDomains/types/linguistic2Tuple/index.js";

const buildDomain = () =>
  linguistic2Tuple.validateCreation({
    name: "Performance",
    definition: {
      labels: ["Very Low", "Low", "Medium", "High", "Very High"],
    },
  });

describe("linguistic2Tuple expression domain", () => {
  it("normalizes three labels with generated keys, indexes, and labelCount", () => {
    expect(
      linguistic2Tuple.validateCreation({
        name: " Rating ",
        definition: { labels: ["Low", "Medium", "High"] },
      })
    ).toEqual({
      name: "Rating",
      typeKey: "linguistic2Tuple",
      definition: {
        labelCount: 3,
        labels: [
          { key: "low", label: "Low", index: 0 },
          { key: "medium", label: "Medium", index: 1 },
          { key: "high", label: "High", index: 2 },
        ],
      },
    });
  });

  it("preserves explicit keys and derives stable indexes for five labels", () => {
    expect(
      linguistic2Tuple.validateCreation({
        name: "Performance",
        definition: {
          labels: [
            { key: "very_low", label: "Very Low" },
            { key: "low", label: "Low" },
            { key: "medium", label: "Medium" },
            { key: "high", label: "High" },
            { key: "very_high", label: "Very High" },
          ],
        },
      })
    ).toMatchObject({
      definition: {
        labelCount: 5,
        labels: [
          { key: "very_low", label: "Very Low", index: 0 },
          { key: "low", label: "Low", index: 1 },
          { key: "medium", label: "Medium", index: 2 },
          { key: "high", label: "High", index: 3 },
          { key: "very_high", label: "Very High", index: 4 },
        ],
      },
    });
  });

  it.each([
    ["fewer than three labels", { labels: ["Low"] }],
    ["an even number of labels", { labels: ["Low", "Medium", "High", "Very High"] }],
    ["duplicate generated keys", { labels: ["Low", "Low", "High"] }],
    ["an empty label", { labels: ["Low", " ", "High"] }],
    ["a malformed label", { labels: ["Low", 2, "High"] }],
    ["a malformed definition", []],
  ])("rejects %s", (_label, definition) => {
    expect(() =>
      linguistic2Tuple.validateCreation({
        name: "Performance",
        definition,
      })
    ).toThrow();
  });

  it.each([
    ["a middle label with alpha zero", { labelKey: "medium", alpha: 0 }],
    ["a positive alpha", { labelKey: "medium", alpha: 0.27 }],
    ["a negative alpha", { labelKey: "high", alpha: -0.27 }],
    ["negative one half with an in-range beta", { labelKey: "low", alpha: -0.5 }],
    ["an alpha immediately below one half", { labelKey: "medium", alpha: 0.49999999999999994 }],
    ["the first label at zero", { labelKey: "very_low", alpha: 0 }],
    ["the last label at zero", { labelKey: "very_high", alpha: 0 }],
    ["a near-boundary beta", { labelKey: "very_high", alpha: -0.49999999999999994 }],
  ])("normalizes %s", (_label, value) => {
    expect(
      linguistic2Tuple.validateEvaluation({
        value,
        expressionDomain: buildDomain(),
      })
    ).toEqual(value);
  });

  it.each([
    ["a string", "high"],
    ["an array", []],
    ["null", null],
    ["a missing alpha", { labelKey: "high" }],
    ["a missing labelKey", { alpha: 0 }],
    ["an additional property", { labelKey: "high", alpha: 0, source: "manual" }],
    ["an unknown labelKey", { labelKey: "unknown", alpha: 0 }],
    ["a non-number alpha", { labelKey: "high", alpha: "0" }],
    ["NaN alpha", { labelKey: "high", alpha: Number.NaN }],
    ["infinite alpha", { labelKey: "high", alpha: Number.POSITIVE_INFINITY }],
    ["an alpha below negative one half", { labelKey: "high", alpha: -0.5000001 }],
    ["an alpha of one half", { labelKey: "high", alpha: 0.5 }],
    ["an alpha above one half", { labelKey: "high", alpha: 0.5000001 }],
    ["a first-label beta below zero", { labelKey: "very_low", alpha: -0.1 }],
    ["a last-label beta above g", { labelKey: "very_high", alpha: 0.1 }],
  ])("rejects %s", (_label, value) => {
    expect(() =>
      linguistic2Tuple.validateEvaluation({
        value,
        expressionDomain: buildDomain(),
      })
    ).toThrow();
  });
});
