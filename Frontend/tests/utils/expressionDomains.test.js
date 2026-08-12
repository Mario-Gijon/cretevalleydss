import { describe, expect, it } from "vitest";

import {
  expressionDomainMatchesSupportedEntry,
  getExpressionDomainFamily,
  getExpressionDomainDisplayMeta,
  isLinguistic2TupleExpressionDomain,
} from "../../src/utils/expressionDomains.js";

describe("expressionDomainMatchesSupportedEntry", () => {
  const buildDomain = (definition) => ({
    _id: "domain-1",
    name: "Test domain",
    typeKey: "linguisticFuzzy",
    definition,
  });

  it("derives family from the frontend catalog instead of trusting the payload", () => {
    expect(
      getExpressionDomainFamily({
        typeKey: "linguisticFuzzy",
        family: "numeric",
      })
    ).toBe("linguistic");
  });

  it("identifies linguistic 2-tuple domains and gives them a label-count descriptor", () => {
    const domain = {
      name: "Preference scale",
      typeKey: "linguistic2Tuple",
      definition: { labelCount: 5 },
    };

    expect(isLinguistic2TupleExpressionDomain(domain)).toBe(true);
    expect(isLinguistic2TupleExpressionDomain({ typeKey: "linguisticOrdinal" })).toBe(false);
    expect(getExpressionDomainDisplayMeta(domain).descriptor).toBe(
      "Linguistic 2-Tuple (5 labels)"
    );
    expect(
      getExpressionDomainDisplayMeta({
        name: "Preference scale",
        typeKey: "linguistic2Tuple",
        definition: {},
      }).descriptor
    ).toBe("Linguistic 2-Tuple");
  });

  it("matches scalar constraints", () => {
    expect(
      expressionDomainMatchesSupportedEntry(
        buildDomain({ labelCount: 3 }),
        {
          typeKey: "linguisticFuzzy",
          constraints: { labelCount: 3 },
        }
      )
    ).toBe(true);
  });

  it("matches array allowed-value constraints", () => {
    expect(
      expressionDomainMatchesSupportedEntry(
        buildDomain({ labelCount: 3 }),
        {
          typeKey: "linguisticFuzzy",
          constraints: { labelCount: [2, 3, 4] },
        }
      )
    ).toBe(true);
  });

  it("matches nested object constraints recursively", () => {
    expect(
      expressionDomainMatchesSupportedEntry(
        buildDomain({
          labelCount: 3,
          alphaRange: {
            min: -0.5,
            max: 0.5,
          },
          labels: ["Low", "Medium", "High"],
        }),
        {
          typeKey: "linguisticFuzzy",
          constraints: {
            labelCount: 3,
            alphaRange: {
              min: -0.5,
              max: 0.5,
            },
          },
        }
      )
    ).toBe(true);
  });

  it("fails when a nested object constraint mismatches", () => {
    expect(
      expressionDomainMatchesSupportedEntry(
        buildDomain({
          labelCount: 3,
          alphaRange: {
            min: -0.25,
            max: 0.5,
          },
        }),
        {
          typeKey: "linguisticFuzzy",
          constraints: {
            alphaRange: {
              min: -0.5,
              max: 0.5,
            },
          },
        }
      )
    ).toBe(false);
  });

  it("keeps derived labelCount matching from labels when labelCount is absent", () => {
    expect(
      expressionDomainMatchesSupportedEntry(
        buildDomain({
          labels: ["Low", "Medium", "High"],
        }),
        {
          typeKey: "linguisticFuzzy",
          constraints: { labelCount: 3 },
        }
      )
    ).toBe(true);
  });
});
