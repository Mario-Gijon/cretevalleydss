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
