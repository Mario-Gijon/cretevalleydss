import { describe, expect, it } from "vitest";

import {
  buildCanonicalGlobalExpressionDomains,
  CANONICAL_GLOBAL_EXPRESSION_DOMAINS,
} from "../../modules/expressionDomains/globalExpressionDomains.js";

describe("canonical global expression domains", () => {
  it("defines exactly the four current global domains", () => {
    expect(CANONICAL_GLOBAL_EXPRESSION_DOMAINS.map(({ typeKey }) => typeKey)).toEqual([
      "numericContinuous",
      "numericDiscrete",
      "linguisticOrdinal",
      "linguisticFuzzy",
    ]);
    expect(Object.isFrozen(CANONICAL_GLOBAL_EXPRESSION_DOMAINS)).toBe(true);
  });

  it("returns validated database-ready documents with normalized definitions", () => {
    const domains = buildCanonicalGlobalExpressionDomains();

    expect(domains).toEqual([
      {
        user: null,
        name: "Continuous 0-1",
        isGlobal: true,
        locked: true,
        typeKey: "numericContinuous",
        definition: { min: 0, max: 1, step: null },
      },
      {
        user: null,
        name: "Discrete 0-9",
        isGlobal: true,
        locked: true,
        typeKey: "numericDiscrete",
        definition: { min: 0, max: 9, step: 1 },
      },
      {
        user: null,
        name: "Ordinal 5",
        isGlobal: true,
        locked: true,
        typeKey: "linguisticOrdinal",
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
      },
      {
        user: null,
        name: "Fuzzy Linguistic 5",
        isGlobal: true,
        locked: true,
        typeKey: "linguisticFuzzy",
        definition: expect.objectContaining({
          membershipFunction: "triangular",
          labelCount: 5,
          labels: expect.arrayContaining([
            expect.objectContaining({ key: "very_low", index: 0, values: [0, 0.1, 0.3] }),
            expect.objectContaining({ key: "very_high", index: 4, values: [0.7, 0.9, 1] }),
          ]),
        }),
      },
    ]);
  });

  it("creates fresh database documents for every build", () => {
    const first = buildCanonicalGlobalExpressionDomains();
    const second = buildCanonicalGlobalExpressionDomains();

    expect(first).not.toBe(second);
    expect(first[3].definition).not.toBe(second[3].definition);
    expect(first).toEqual(second);
  });
});
