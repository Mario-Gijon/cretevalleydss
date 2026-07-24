import { describe, expect, it } from "vitest";

import {
  getAlternativeCriteriaMatrixPayload as buildGetPayload,
} from "../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.get.js";
import { saveAlternativeCriteriaMatrixPayload } from "../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.save.js";

const normalizePayloadOrThrow = ({ requireValue, ...args }) =>
  saveAlternativeCriteriaMatrixPayload({
    ...args,
    mode: requireValue ? "submit" : "draft",
  });

const buildNumericContinuousDomain = () => ({
  typeKey: "numericContinuous",
  definition: {
    min: 0,
    max: 10,
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

const buildFuzzyDomain = () => ({
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labels: [
      { key: "low", label: "Low", values: [0, 0.2, 0.4], index: 0 },
      { key: "high", label: "High", values: [0.6, 0.8, 1], index: 1 },
    ],
  },
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

const buildCanonicalPayload = (firstValue = 7.5, secondValue = 6.5) => ({
  "alt-a": {
    "criterion-1": { value: firstValue },
  },
  "alt-b": {
    "criterion-1": { value: secondValue },
  },
});

describe("alternativeCriteriaMatrix", () => {
  it("builds the complete canonical empty matrix for GET initialization", async () => {
    const result = await buildGetPayload({
      payload: undefined,
      decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
    });

    expect(result).toEqual({
      "alt-a": {
        "criterion-1": { value: "" },
      },
      "alt-b": {
        "criterion-1": { value: "" },
      },
    });
  });

  it("accepts canonical numeric draft and submit matrices", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: buildCanonicalPayload("", 6.5),
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: false,
      })
    ).resolves.toEqual({
      "alt-a": {
        "criterion-1": { value: "" },
      },
      "alt-b": {
        "criterion-1": { value: 6.5 },
      },
    });

    const submitted = await normalizePayloadOrThrow({
      payload: buildCanonicalPayload(),
      decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
      requireValue: true,
    });

    expect(submitted).toEqual(buildCanonicalPayload());
    expect(Object.keys(submitted["alt-a"]["criterion-1"])).toEqual(["value"]);
    expect(submitted["alt-a"]["criterion-1"]).not.toHaveProperty("expressionDomain");
  });

  it("accepts canonical ordinal and fuzzy labelKey values", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: buildCanonicalPayload({ labelKey: "medium" }, { labelKey: "low" }),
        decisionContext: buildDecisionContext(buildOrdinalDomain()),
        requireValue: true,
      })
    ).resolves.toEqual({
      "alt-a": {
        "criterion-1": { value: { labelKey: "medium" } },
      },
      "alt-b": {
        "criterion-1": { value: { labelKey: "low" } },
      },
    });

    await expect(
      normalizePayloadOrThrow({
        payload: buildCanonicalPayload({ labelKey: "high" }, { labelKey: "low" }),
        decisionContext: buildDecisionContext(buildFuzzyDomain()),
        requireValue: true,
      })
    ).resolves.toEqual({
      "alt-a": {
        "criterion-1": { value: { labelKey: "high" } },
      },
      "alt-b": {
        "criterion-1": { value: { labelKey: "low" } },
      },
    });
  });

  it("rejects primitive and non-canonical cells", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: {
          "alt-a": {
            "criterion-1": 7.5,
          },
          "alt-b": {
            "criterion-1": { value: 6.5 },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("Matrix cell must be an object.");

    for (const cell of [
      { value: 7.5, domain: buildNumericContinuousDomain() },
      { value: 7.5, expressionDomain: buildNumericContinuousDomain() },
      { value: 7.5, note: "extra" },
    ]) {
      await expect(
        normalizePayloadOrThrow({
          payload: {
            "alt-a": {
              "criterion-1": cell,
            },
            "alt-b": {
              "criterion-1": { value: 6.5 },
            },
          },
          decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
          requireValue: true,
        })
      ).rejects.toThrow("Matrix cell must contain exactly the key 'value'.");
    }
  });

  it("rejects missing or unknown rows and cells", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: {
          "alt-a": {
            "criterion-1": { value: 7.5 },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("payload is missing an alternative row.");

    await expect(
      normalizePayloadOrThrow({
        payload: {
          ...buildCanonicalPayload(),
          "alt-c": {
            "criterion-1": { value: 5 },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("payload contains unknown alternative rows");

    await expect(
      normalizePayloadOrThrow({
        payload: {
          "alt-a": {},
          "alt-b": {
            "criterion-1": { value: 6.5 },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("Alternative criteria row is missing a criterion cell.");

    await expect(
      normalizePayloadOrThrow({
        payload: {
          "alt-a": {
            "criterion-1": { value: 7.5 },
            "criterion-2": { value: 6 },
          },
          "alt-b": {
            "criterion-1": { value: 6.5 },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("Alternative criteria row contains unknown criterion cells.");
  });

  it("rejects null, undefined, and empty submit values", async () => {
    await expect(
      normalizePayloadOrThrow({
        payload: buildCanonicalPayload(null, 6.5),
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: false,
      })
    ).rejects.toThrow("Matrix cell value is invalid.");

    await expect(
      normalizePayloadOrThrow({
        payload: {
          "alt-a": {
            "criterion-1": { value: undefined },
          },
          "alt-b": {
            "criterion-1": { value: 6.5 },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: false,
      })
    ).rejects.toThrow("Matrix cell value is invalid.");

    await expect(
      normalizePayloadOrThrow({
        payload: buildCanonicalPayload("", 6.5),
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
        requireValue: true,
      })
    ).rejects.toThrow("All cells must include a value for submit.");
  });

  it("rejects malformed stored GET payloads", async () => {
    await expect(
      buildGetPayload({
        payload: {
          "alt-a": {
            "criterion-1": { value: 7.5 },
          },
        },
        decisionContext: buildDecisionContext(buildNumericContinuousDomain()),
      })
    ).rejects.toThrow("payload is missing an alternative row.");
  });
});
