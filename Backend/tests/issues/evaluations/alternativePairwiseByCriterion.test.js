import { describe, expect, it } from "vitest";

import {
  getAlternativePairwiseByCriterionPayload as buildGetPayload,
} from "../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.get.js";
import { saveAlternativePairwiseByCriterionPayload } from "../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.save.js";

const normalizePayloadOrThrow = ({ requireValue, ...args }) =>
  saveAlternativePairwiseByCriterionPayload({
    ...args,
    mode: requireValue ? "submit" : "draft",
  });

const buildDecisionContext = (expressionDomain) => ({
  alternatives: [
    { id: "alt-a", name: "Alternative A" },
    { id: "alt-b", name: "Alternative B" },
  ],
  leafCriteria: [
    {
      id: "criterion-1",
      name: "Criterion 1",
      expressionDomain,
    },
  ],
});

const buildNumericContinuousDomain = () => ({
  typeKey: "numericContinuous",
  definition: {
    min: 1,
    max: 5,
  },
});

const buildOrdinalDomain = () => ({
  typeKey: "linguisticOrdinal",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "medium", label: "Medium", index: 1 },
      { key: "high", label: "High", index: 2 },
    ],
  },
});

const buildFuzzyMatchingDomain = () => ({
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labels: [
      { key: "low", label: "Low", values: [0, 0, 0.2], index: 0 },
      { key: "high", label: "High", values: [0.8, 1, 1], index: 1 },
    ],
  },
});

const buildFuzzyUnmatchedDomain = () => ({
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labels: [
      { key: "custom", label: "Custom", values: [0.1, 0.3, 0.9], index: 0 },
      { key: "high", label: "High", values: [0.8, 1, 1], index: 1 },
    ],
  },
});

const buildCanonicalPayload = ({ upperValue, lowerValue }) => ({
  "criterion-1": {
    "alt-a": {
      "alt-b": { value: upperValue },
    },
    "alt-b": {
      "alt-a": { value: lowerValue },
    },
  },
});

describe("alternativePairwiseByCriterion", () => {
  it("accepts a canonical numericContinuous full matrix", async () => {
    const result = await normalizePayloadOrThrow({
      payload: buildCanonicalPayload({
        upperValue: 2,
        lowerValue: 4,
      }),
      decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
      requireValue: true,
    });

    expect(result).toEqual({
      "criterion-1": {
        "alt-a": { "alt-b": { value: 2 } },
        "alt-b": { "alt-a": { value: 4 } },
      },
    });
  });

  it("normalized cells contain only value", async () => {
    const result = await normalizePayloadOrThrow({
      payload: buildCanonicalPayload({
        upperValue: 2,
        lowerValue: 4,
      }),
      decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
      requireValue: true,
    });

    expect(Object.keys(result["criterion-1"]["alt-a"]["alt-b"])).toEqual(["value"]);
    expect(result["criterion-1"]["alt-a"]["alt-b"]).not.toHaveProperty("expressionDomain");
  });

  it("rejects primitive cells", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: {
          "criterion-1": {
            "alt-a": { "alt-b": 2 },
            "alt-b": { "alt-a": { value: 4 } },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("Pairwise cell must be an object.");
  });

  it("rejects domain-bearing cells", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: {
          "criterion-1": {
            "alt-a": {
              "alt-b": {
                value: 2,
                expressionDomain: buildNumericContinuousDomain(),
              },
            },
            "alt-b": { "alt-a": { value: 4 } },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("Pairwise cell must contain exactly the key 'value'.");
  });

  it("rejects a missing directed pair", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: {
          "criterion-1": {
            "alt-a": {},
            "alt-b": { "alt-a": { value: 4 } },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("Pairwise row is missing a directed comparison.");
  });

  it("rejects a diagonal key", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: {
          "criterion-1": {
            "alt-a": {
              "alt-a": { value: 1 },
              "alt-b": { value: 2 },
            },
            "alt-b": { "alt-a": { value: 4 } },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("Diagonal pairwise cells are not allowed.");
  });

  it("rejects a mismatched reflected value", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: buildCanonicalPayload({
          upperValue: 2,
          lowerValue: 3,
        }),
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toMatchObject({
      code: "PAIRWISE_REFLECTION_MISMATCH",
      field: "payload.criterion-1.alt-b.alt-a.value",
    });
  });

  it("accepts a draft pair with both directions empty", async () => {
    const result = await normalizePayloadOrThrow({
      payload: buildCanonicalPayload({
        upperValue: "",
        lowerValue: "",
      }),
      decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
      requireValue: false,
    });

    expect(result["criterion-1"]["alt-a"]["alt-b"]).toEqual({ value: "" });
    expect(result["criterion-1"]["alt-b"]["alt-a"]).toEqual({ value: "" });
  });

  it("rejects a draft pair when only one direction is empty", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: buildCanonicalPayload({
          upperValue: 2,
          lowerValue: "",
        }),
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: false,
      })
    ).rejects.toThrow(
      "Draft pairwise comparisons must leave both directions empty or both filled."
    );
  });

  it("accepts ordinal reflection", async () => {
    const result = await normalizePayloadOrThrow({
      payload: buildCanonicalPayload({
        upperValue: { labelKey: "low" },
        lowerValue: { labelKey: "high" },
      }),
      decisionContext: buildDecisionContext(buildOrdinalDomain()),
      requireValue: true,
    });

    expect(result["criterion-1"]["alt-b"]["alt-a"]).toEqual({
      value: { labelKey: "high" },
    });
  });

  it("accepts a fuzzy label upper and derived values lower", async () => {
    const result = await normalizePayloadOrThrow({
      payload: buildCanonicalPayload({
        upperValue: { labelKey: "high" },
        lowerValue: { values: [0, 0, 0.2] },
      }),
      decisionContext: buildDecisionContext(buildFuzzyMatchingDomain()),
      requireValue: true,
    });

    expect(result["criterion-1"]["alt-b"]["alt-a"]).toEqual({
      value: { values: [0, 0, 0.19999999999999996] },
    });
  });

  it("accepts a fuzzy inverse that does not match a configured label", async () => {
    const result = await normalizePayloadOrThrow({
      payload: buildCanonicalPayload({
        upperValue: { labelKey: "custom" },
        lowerValue: { values: [0.09999999999999998, 0.7, 0.9] },
      }),
      decisionContext: buildDecisionContext(buildFuzzyUnmatchedDomain()),
      requireValue: true,
    });

    expect(result["criterion-1"]["alt-b"]["alt-a"].value).toEqual({
      values: [0.09999999999999998, 0.7, 0.9],
    });
  });

  it("rejects an incompatible numericDiscrete domain", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: buildCanonicalPayload({
          upperValue: 0.3,
          lowerValue: 0.7,
        }),
        decisionContext: buildDecisionContext({
          typeKey: "numericDiscrete",
          definition: { min: 0, max: 1, step: 0.3 },
        }),
        requireValue: true,
      })
    ).rejects.toMatchObject({
      code: "PAIRWISE_REFLECTION_INCOMPATIBLE_DOMAIN",
      field: "expressionDomain.definition.step",
    });
  });

  it("builds the complete canonical empty matrix for GET initialization", async () => {
    const result = await buildGetPayload({
      payload: undefined,
      decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
    });

    expect(result).toEqual({
      "criterion-1": {
        "alt-a": { "alt-b": { value: "" } },
        "alt-b": { "alt-a": { value: "" } },
      },
    });
  });

  it("keeps an existing canonical GET payload canonical", async () => {
    const result = await buildGetPayload({
      payload: buildCanonicalPayload({
        upperValue: 2,
        lowerValue: 4,
      }),
      decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
    });

    expect(result).toEqual({
      "criterion-1": {
        "alt-a": { "alt-b": { value: 2 } },
        "alt-b": { "alt-a": { value: 4 } },
      },
    });
  });
});
