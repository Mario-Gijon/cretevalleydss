import { describe, expect, it } from "vitest";

import {
  isDomainSnapshotSupportedByModel,
} from "../../modules/expressionDomains/domainCompatibility.js";

describe("domainCompatibility", () => {
  it("matches scalar supported-expression-domain constraints", () => {
    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "linguisticFuzzy",
          definition: {
            labelCount: 3,
          },
        },
        supportedExpressionDomains: [
          {
            typeKey: "linguisticFuzzy",
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
          typeKey: "linguisticFuzzy",
          definition: {
            labelCount: 3,
          },
        },
        supportedExpressionDomains: [
          {
            typeKey: "linguisticFuzzy",
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
          typeKey: "linguisticFuzzy",
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
            typeKey: "linguisticFuzzy",
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
          typeKey: "linguisticFuzzy",
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
            typeKey: "linguisticFuzzy",
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
          typeKey: "linguisticFuzzy",
          definition: {
            labels: ["Low", "Medium", "High"],
          },
        },
        supportedExpressionDomains: [
          {
            typeKey: "linguisticFuzzy",
            constraints: {
              labelCount: 3,
            },
          },
        ],
      })
    ).toBe(true);
  });

  it("matches Herrera-Viedma's restricted numericContinuous metadata exactly", () => {
    const supportedExpressionDomains = [
      {
        typeKey: "numericContinuous",
        constraints: {
          min: 0,
          max: 1,
        },
      },
    ];

    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "numericContinuous",
          definition: {
            min: 0,
            max: 1,
          },
        },
        supportedExpressionDomains,
      })
    ).toBe(true);

    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "numericContinuous",
          definition: {
            min: 1,
            max: 5,
          },
        },
        supportedExpressionDomains,
      })
    ).toBe(false);

    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "numericContinuous",
          definition: {
            min: 0,
            max: 5,
          },
        },
        supportedExpressionDomains,
      })
    ).toBe(false);

    expect(
      isDomainSnapshotSupportedByModel({
        domainSnapshot: {
          typeKey: "numericDiscrete",
          definition: {
            min: 0,
            max: 1,
            step: 0.25,
          },
        },
        supportedExpressionDomains,
      })
    ).toBe(false);
  });
});
