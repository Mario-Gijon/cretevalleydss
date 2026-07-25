import { describe, expect, it } from "vitest";

import { getAlternativePairwiseByCriterionPayload } from "../../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.get.js";
import { saveAlternativePairwiseByCriterionPayload } from "../../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.save.js";

const numericDomain = {
  typeKey: "numericContinuous",
  definition: { min: 1, max: 5 },
};

const ordinalDomain = {
  typeKey: "linguisticOrdinal",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "medium", label: "Medium", index: 1 },
      { key: "high", label: "High", index: 2 },
    ],
  },
};

const fuzzyDomain = {
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labels: [
      { key: "low", label: "Low", values: [0, 0, 0.2], index: 0 },
      { key: "high", label: "High", values: [0.8, 1, 1], index: 1 },
    ],
  },
};

const buildDecisionContext = (expressionDomain = numericDomain) => ({
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

const buildPayload = (upperValue = 2, lowerValue = 4) => ({
  "criterion-1": {
    "alt-a": { "alt-b": upperValue },
    "alt-b": { "alt-a": lowerValue },
  },
});

const savePayload = ({
  payload,
  expressionDomain = numericDomain,
  mode = "submit",
}) =>
  saveAlternativePairwiseByCriterionPayload({
    payload,
    decisionContext: buildDecisionContext(expressionDomain),
    mode,
  });

describe("alternativePairwiseByCriterion payload", () => {
  it("builds a complete empty payload with direct values", async () => {
    await expect(
      getAlternativePairwiseByCriterionPayload({
        payload: undefined,
        decisionContext: buildDecisionContext(),
      })
    ).resolves.toEqual(buildPayload("", ""));
  });

  it("accepts and normalizes a canonical numeric direct matrix", async () => {
    await expect(savePayload({ payload: buildPayload() })).resolves.toEqual(
      buildPayload()
    );
  });

  it("rejects the former value wrapper", async () => {
    await expect(
      savePayload({
        payload: buildPayload({ value: 2 }, 4),
      })
    ).rejects.toThrow();
  });

  it("rejects unknown criteria", async () => {
    await expect(
      savePayload({
        payload: {
          ...buildPayload(),
          unknown: {},
        },
      })
    ).rejects.toThrow("payload contains unknown criterion keys");
  });

  it("rejects unknown rows", async () => {
    const payload = buildPayload();
    payload["criterion-1"].unknown = {};

    await expect(savePayload({ payload })).rejects.toThrow(
      "Criterion matrix contains unknown row alternatives."
    );
  });

  it("rejects unknown columns", async () => {
    const payload = buildPayload();
    payload["criterion-1"]["alt-a"].unknown = 3;

    await expect(savePayload({ payload })).rejects.toThrow(
      "Pairwise row contains unknown column alternatives."
    );
  });

  it("rejects diagonal keys", async () => {
    const payload = buildPayload();
    payload["criterion-1"]["alt-a"]["alt-a"] = 3;

    await expect(savePayload({ payload })).rejects.toThrow(
      "Diagonal pairwise values are not allowed."
    );
  });

  it("rejects a missing directed comparison", async () => {
    const payload = buildPayload();
    delete payload["criterion-1"]["alt-a"]["alt-b"];

    await expect(savePayload({ payload })).rejects.toThrow(
      "Pairwise row is missing a directed comparison."
    );
  });

  it("rejects an incorrect reflection with a direct error field", async () => {
    await expect(
      savePayload({
        payload: buildPayload(2, 3),
      })
    ).rejects.toMatchObject({
      code: "PAIRWISE_REFLECTION_MISMATCH",
      field: "payload.criterion-1.alt-b.alt-a",
    });
  });

  it("keeps both directions empty in draft mode", async () => {
    await expect(
      savePayload({
        payload: buildPayload("", ""),
        mode: "draft",
      })
    ).resolves.toEqual(buildPayload("", ""));
  });

  it("rejects a draft with only one empty direction", async () => {
    await expect(
      savePayload({
        payload: buildPayload(2, ""),
        mode: "draft",
      })
    ).rejects.toMatchObject({
      field: "payload.criterion-1.alt-b.alt-a",
    });
  });

  it("requires direct values in submit mode", async () => {
    await expect(
      savePayload({
        payload: buildPayload("", ""),
      })
    ).rejects.toMatchObject({
      field: "payload.criterion-1.alt-a.alt-b",
    });
  });

  it("normalizes ordinal reflection as direct values", async () => {
    const payload = buildPayload(
      { labelKey: "low" },
      { labelKey: "high" }
    );

    await expect(
      savePayload({
        payload,
        expressionDomain: ordinalDomain,
      })
    ).resolves.toEqual(payload);
  });

  it("normalizes fuzzy reflection as direct values", async () => {
    await expect(
      savePayload({
        payload: buildPayload(
          { labelKey: "high" },
          { values: [0, 0, 0.2] }
        ),
        expressionDomain: fuzzyDomain,
      })
    ).resolves.toEqual(
      buildPayload(
        { labelKey: "high" },
        { values: [0, 0, 0.19999999999999996] }
      )
    );
  });
});
