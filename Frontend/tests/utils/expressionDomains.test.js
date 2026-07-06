import { describe, expect, it } from "vitest";

import {
  expressionDomainMatchesSupportedEntry,
} from "../../src/utils/expressionDomains.js";

describe("expressionDomainMatchesSupportedEntry", () => {
  const buildDomain = (definition) => ({
    _id: "domain-1",
    name: "Test domain",
    typeKey: "linguisticTwoTupleScale",
    definition,
  });

  it("matches scalar constraints", () => {
    expect(
      expressionDomainMatchesSupportedEntry(
        buildDomain({ labelCount: 3 }),
        {
          typeKey: "linguisticTwoTupleScale",
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
          typeKey: "linguisticTwoTupleScale",
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
          typeKey: "linguisticTwoTupleScale",
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
          typeKey: "linguisticTwoTupleScale",
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
          typeKey: "linguisticTwoTupleScale",
          constraints: { labelCount: 3 },
        }
      )
    ).toBe(true);
  });
});
