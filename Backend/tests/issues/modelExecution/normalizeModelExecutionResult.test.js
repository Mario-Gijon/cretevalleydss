import { describe, expect, it } from "vitest";

import { normalizeModelExecutionResult } from "../../../modules/issues/modelExecution/normalizeModelExecutionResult.js";

const result = (rankedAlternatives) => ({
  rankedAlternatives,
  collectiveEvaluations: {},
  plotsGraphic: {},
  consensusMeasure: null,
  rawOutput: {},
});

const rankedAlternative = (overrides = {}) => ({
  alternativeId: "alternative-1",
  name: "Alternative A",
  score: 0.812,
  rank: 1,
  ...overrides,
});

describe("standardized ranked-alternative normalization", () => {
  it("preserves the complete ranking@1 result contract", () => {
    const source = {
      rankedAlternatives: [
        rankedAlternative({
          alternativeId: "alternative-1",
          name: "  Alternative A  ",
          score: "0.812",
          rank: "1",
          classification: "  strong  ",
          resultLabel: "  Preferred  ",
          ignored: true,
        }),
      ],
      collectiveEvaluations: { expertA: { value: 0.8 } },
      plotsGraphic: { scores: [0.812] },
      consensusMeasure: 0.75,
      consensusLifecycle: { phase: 2, status: "converged" },
      rawOutput: { vendorPayload: [1, 2, 3] },
    };

    expect(normalizeModelExecutionResult({ result: source })).toEqual({
      rankedAlternatives: [
        {
          alternativeId: "alternative-1",
          name: "Alternative A",
          score: 0.812,
          rank: 1,
          classification: "strong",
          resultLabel: "Preferred",
        },
      ],
      collectiveEvaluations: { expertA: { value: 0.8 } },
      plotsGraphic: { scores: [0.812] },
      consensusMeasure: 0.75,
      consensusLifecycle: { phase: 2, status: "converged" },
      rawOutput: { vendorPayload: [1, 2, 3] },
    });
  });

  it.each([
    ["result shape", [], "Model execution result must be an object", "result"],
    [
      "ranked alternatives",
      {},
      "Model execution result.rankedAlternatives must be a non-empty array",
      "result.rankedAlternatives",
    ],
    [
      "ranked entry",
      result([null]),
      "Each ranked alternative must be an object",
      "result.rankedAlternatives[0]",
    ],
    [
      "ranked name",
      result([rankedAlternative({ name: "  " })]),
      "Each ranked alternative requires a name",
      "result.rankedAlternatives[0].name",
    ],
    [
      "alternative identifier",
      result([rankedAlternative({ alternativeId: 7 })]),
      "Each ranked alternative alternativeId must be a string or null",
      "result.rankedAlternatives[0].alternativeId",
    ],
    [
      "score",
      result([rankedAlternative({ score: "not-a-score" })]),
      "Each ranked alternative requires a finite score",
      "result.rankedAlternatives[0].score",
    ],
    [
      "rank",
      result([rankedAlternative({ rank: 0 })]),
      "Each ranked alternative requires a positive integer rank",
      "result.rankedAlternatives[0].rank",
    ],
    [
      "rank ordering",
      result([
        rankedAlternative({ rank: 2 }),
        rankedAlternative({ alternativeId: "alternative-2", rank: 1 }),
      ]),
      "rankedAlternatives must be ordered from best to worst by rank",
      "result.rankedAlternatives",
    ],
    [
      "collective evaluations",
      { ...result([rankedAlternative()]), collectiveEvaluations: null },
      "Model execution result.collectiveEvaluations is required",
      "result.collectiveEvaluations",
    ],
    [
      "plots graphic",
      { ...result([rankedAlternative()]), plotsGraphic: [] },
      "Model execution result.plotsGraphic must be an object",
      "result.plotsGraphic",
    ],
    [
      "consensus measure",
      { ...result([rankedAlternative()]), consensusMeasure: "0.5" },
      "Model execution result.consensusMeasure must be finite or null",
      "result.consensusMeasure",
    ],
    [
      "raw output",
      { ...result([rankedAlternative()]), rawOutput: null },
      "Model execution result.rawOutput is required",
      "result.rawOutput",
    ],
  ])("retains ranking@1 validation for invalid %s", (_label, invalid, message, field) => {
    expect(() => normalizeModelExecutionResult({ result: invalid })).toThrow(
      expect.objectContaining({ message, field })
    );
  });

  it("keeps alternatives without classification valid and canonical", () => {
    const normalized = normalizeModelExecutionResult({
      result: result([rankedAlternative({ ignored: "not persisted" })]),
    });

    expect(normalized.rankedAlternatives).toEqual([{
      alternativeId: "alternative-1",
      name: "Alternative A",
      score: 0.812,
      rank: 1,
    }]);
  });

  it.each([
    ["high", "high"],
    ["  high  ", "high"],
  ])("normalizes classification %j", (classification, expected) => {
    const normalized = normalizeModelExecutionResult({
      result: result([rankedAlternative({ classification })]),
    });

    expect(normalized.rankedAlternatives[0]).toMatchObject({
      classification: expected,
    });
  });

  it.each(["", "   ", null, 1, {}])(
    "rejects invalid classification %j",
    (classification) => {
      expect(() => normalizeModelExecutionResult({
        result: result([rankedAlternative({ classification })]),
      })).toThrow(expect.objectContaining({
        field: "result.rankedAlternatives[0].classification",
      }));
    }
  );

  it("preserves a non-empty result label", () => {
    const normalized = normalizeModelExecutionResult({
      result: result([rankedAlternative({ resultLabel: "  High  " })]),
    });

    expect(normalized.rankedAlternatives[0].resultLabel).toBe("High");
  });

  it.each(["", "   ", null, 1, {}])(
    "rejects invalid resultLabel %j",
    (resultLabel) => {
      expect(() => normalizeModelExecutionResult({
        result: result([rankedAlternative({ resultLabel })]),
      })).toThrow(expect.objectContaining({
        field: "result.rankedAlternatives[0].resultLabel",
      }));
    }
  );

  it("preserves the canonical classification in scenario standardized output", () => {
    const normalized = normalizeModelExecutionResult({
      result: result([rankedAlternative({ classification: "medium" })]),
      options: {
        requireResultObject: false,
        validateAlternativeIdType: false,
        enforceRankOrdering: false,
      },
    });

    expect(normalized.rankedAlternatives[0]).toMatchObject({
      classification: "medium",
    });
  });
});
