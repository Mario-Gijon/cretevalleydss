import { describe, expect, it } from "vitest";

import { resolveMatrixCell } from "./resolveAlternativeCriteriaMatrixCell";

describe("resolveMatrixCell", () => {
  const fallbackExpressionDomain = { typeKey: "fallback" };
  const legacyExpressionDomain = { typeKey: "legacy" };
  const canonicalExpressionDomain = { typeKey: "canonical" };

  it("returns fallbackExpressionDomain for null and undefined cells", () => {
    expect(
      resolveMatrixCell({
        cell: null,
        fallbackExpressionDomain,
      })
    ).toEqual({
      value: "",
      expressionDomain: fallbackExpressionDomain,
    });

    expect(
      resolveMatrixCell({
        cell: undefined,
        fallbackExpressionDomain,
      })
    ).toEqual({
      value: "",
      expressionDomain: fallbackExpressionDomain,
    });
  });

  it("preserves primitive cell values with fallbackExpressionDomain", () => {
    expect(
      resolveMatrixCell({
        cell: 7,
        fallbackExpressionDomain,
      })
    ).toEqual({
      value: 7,
      expressionDomain: fallbackExpressionDomain,
    });
  });

  it("resolves object cell values", () => {
    expect(
      resolveMatrixCell({
        cell: {
          value: { labelKey: "medium" },
          expressionDomain: canonicalExpressionDomain,
        },
        fallbackExpressionDomain,
      })
    ).toEqual({
      value: { labelKey: "medium" },
      expressionDomain: canonicalExpressionDomain,
    });
  });

  it("prefers cell.expressionDomain over legacy cell.domain when both exist", () => {
    expect(
      resolveMatrixCell({
        cell: {
          value: 3,
          expressionDomain: canonicalExpressionDomain,
          domain: legacyExpressionDomain,
        },
        fallbackExpressionDomain,
      })
    ).toEqual({
      value: 3,
      expressionDomain: canonicalExpressionDomain,
    });
  });

  it("falls back to legacy cell.domain when expressionDomain is missing", () => {
    expect(
      resolveMatrixCell({
        cell: {
          value: 4,
          domain: legacyExpressionDomain,
        },
        fallbackExpressionDomain,
      })
    ).toEqual({
      value: 4,
      expressionDomain: legacyExpressionDomain,
    });
  });
});
