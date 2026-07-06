import { describe, expect, it } from "vitest";

import {
  isDomainSnapshotSupportedByModel,
} from "../../modules/expressionDomains/domainCompatibility.js";

describe("domainCompatibility", () => {
  it("matches scalar supported-expression-domain constraints", () => {
    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "linguisticTwoTupleScale",
          definition: {
            labelCount: 3,
          },
        },
        supportedExpressionDomains: [
          {
            typeKey: "linguisticTwoTupleScale",
            constraints: {
              labelCount: 3,
            },
          },
        ],
      })
    ).toBe(true);
  });

  it("matches array supported-expression-domain constraints", () => {
    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "linguisticTwoTupleScale",
          definition: {
            labelCount: 3,
          },
        },
        supportedExpressionDomains: [
          {
            typeKey: "linguisticTwoTupleScale",
            constraints: {
              labelCount: [2, 3, 4],
            },
          },
        ],
      })
    ).toBe(true);
  });

  it("matches nested supported-expression-domain constraints recursively", () => {
    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "linguisticTwoTupleScale",
          definition: {
            labelCount: 3,
            alphaRange: {
              min: -0.5,
              max: 0.5,
            },
            labels: ["Low", "Medium", "High"],
          },
        },
        supportedExpressionDomains: [
          {
            typeKey: "linguisticTwoTupleScale",
            constraints: {
              labelCount: 3,
              alphaRange: {
                min: -0.5,
                max: 0.5,
              },
            },
          },
        ],
      })
    ).toBe(true);
  });

  it("fails when nested supported-expression-domain constraints mismatch", () => {
    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "linguisticTwoTupleScale",
          definition: {
            labelCount: 3,
            alphaRange: {
              min: -0.25,
              max: 0.5,
            },
          },
        },
        supportedExpressionDomains: [
          {
            typeKey: "linguisticTwoTupleScale",
            constraints: {
              alphaRange: {
                min: -0.5,
                max: 0.5,
              },
            },
          },
        ],
      })
    ).toBe(false);
  });

  it("still derives labelCount from labels for compatibility matching", () => {
    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "linguisticTwoTupleScale",
          definition: {
            labels: ["Low", "Medium", "High"],
          },
        },
        supportedExpressionDomains: [
          {
            typeKey: "linguisticTwoTupleScale",
            constraints: {
              labelCount: 3,
            },
          },
        ],
      })
    ).toBe(true);
  });
});
