import { describe, expect, it } from "vitest";

import {
  requireCanonicalAlternativeCriteriaMatrix,
  resolveCanonicalCollectiveAlternativeCriteriaMatrix,
  updateAlternativeCriteriaMatrixCell,
} from "./alternativeCriteriaMatrix.helpers.js";

const alternatives = [
  { id: "alt-a", name: "Alternative A" },
  { id: "alt-b", name: "Alternative B" },
];

const criteria = [
  {
    id: "criterion-1",
    name: "Criterion 1",
    expressionDomain: {
      typeKey: "numericContinuous",
      definition: { min: 0, max: 10 },
    },
  },
  {
    id: "criterion-2",
    name: "Criterion 2",
    expressionDomain: {
      typeKey: "linguisticOrdinal",
      definition: {
        labels: [
          { key: "low", label: "Low", index: 0 },
          { key: "high", label: "High", index: 1 },
        ],
      },
    },
  },
];

const buildCanonicalMatrix = () => ({
  "alt-a": {
    "criterion-1": { value: 7.5 },
    "criterion-2": { value: { labelKey: "low" } },
  },
  "alt-b": {
    "criterion-1": { value: 6.5 },
    "criterion-2": { value: { labelKey: "high" } },
  },
});

describe("alternativeCriteriaMatrix helpers", () => {
  it("accepts a complete canonical matrix", () => {
    expect(
      requireCanonicalAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        evaluations: buildCanonicalMatrix(),
      })
    ).toEqual(buildCanonicalMatrix());
  });

  it("rejects missing or unknown rows and cells", () => {
    expect(() =>
      requireCanonicalAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        evaluations: {
          "alt-a": {
            "criterion-1": { value: 7.5 },
            "criterion-2": { value: { labelKey: "low" } },
          },
        },
      })
    ).toThrow("Evaluation payload is missing an alternative row.");

    expect(() =>
      requireCanonicalAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        evaluations: {
          ...buildCanonicalMatrix(),
          "alt-c": {
            "criterion-1": { value: 5 },
            "criterion-2": { value: { labelKey: "low" } },
          },
        },
      })
    ).toThrow("Evaluation payload contains unknown alternative rows.");

    expect(() =>
      requireCanonicalAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        evaluations: {
          "alt-a": {
            "criterion-1": { value: 7.5 },
            "criterion-2": { value: { labelKey: "low" } },
          },
          "alt-b": {
            "criterion-1": { value: 6.5 },
          },
        },
      })
    ).toThrow("Alternative criteria row is missing a criterion cell.");

    expect(() =>
      requireCanonicalAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        evaluations: {
          "alt-a": {
            "criterion-1": { value: 7.5 },
            "criterion-2": { value: { labelKey: "low" } },
            "criterion-3": { value: 0 },
          },
          "alt-b": buildCanonicalMatrix()["alt-b"],
        },
      })
    ).toThrow("Alternative criteria row contains unknown criterion cells.");
  });

  it("rejects primitive, domain-bearing, and metadata-bearing cells", () => {
    expect(() =>
      requireCanonicalAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        evaluations: {
          "alt-a": {
            "criterion-1": 7.5,
            "criterion-2": { value: { labelKey: "low" } },
          },
          "alt-b": buildCanonicalMatrix()["alt-b"],
        },
      })
    ).toThrow("Matrix cell must be an object.");

    for (const cell of [
      { value: 7.5, domain: { typeKey: "numericContinuous" } },
      { value: 7.5, expressionDomain: { typeKey: "numericContinuous" } },
      { value: 7.5, extra: true },
    ]) {
      expect(() =>
        requireCanonicalAlternativeCriteriaMatrix({
          alternatives,
          criteria,
          evaluations: {
            "alt-a": {
              "criterion-1": cell,
              "criterion-2": { value: { labelKey: "low" } },
            },
            "alt-b": buildCanonicalMatrix()["alt-b"],
          },
        })
      ).toThrow("Matrix cell must contain exactly the key 'value'.");
    }
  });

  it("updates only one canonical cell and never writes expressionDomain", () => {
    const result = updateAlternativeCriteriaMatrixCell({
      alternatives,
      criteria,
      evaluations: buildCanonicalMatrix(),
      alternativeId: "alt-b",
      criterionId: "criterion-1",
      nextValue: 9,
    });

    expect(result).toEqual({
      "alt-a": {
        "criterion-1": { value: 7.5 },
        "criterion-2": { value: { labelKey: "low" } },
      },
      "alt-b": {
        "criterion-1": { value: 9 },
        "criterion-2": { value: { labelKey: "high" } },
      },
    });
    expect(result["alt-b"]["criterion-1"]).not.toHaveProperty("expressionDomain");
  });

  it("rejects invalid previous state instead of replacing it", () => {
    expect(() =>
      updateAlternativeCriteriaMatrixCell({
        alternatives,
        criteria,
        evaluations: {},
        alternativeId: "alt-a",
        criterionId: "criterion-1",
        nextValue: 9,
      })
    ).toThrow("Evaluation payload is missing an alternative row.");
  });

  it("accepts absent collective payloads and sparse valid collective cells", () => {
    expect(
      resolveCanonicalCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: null,
      })
    ).toBeNull();

    expect(
      resolveCanonicalCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          "alt-a": {
            "criterion-1": 7.2,
            "criterion-2": [0.6, 0.8, 1],
          },
        },
      })
    ).toEqual({
      "alt-a": {
        "criterion-1": 7.2,
        "criterion-2": [0.6, 0.8, 1],
      },
    });
  });

  it("rejects malformed present collective values and unknown collective ids", () => {
    expect(() =>
      resolveCanonicalCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          "alt-a": {
            "criterion-1": { localizedLabel: "Legacy" },
          },
        },
      })
    ).toThrow("must be a finite number or a non-empty array of finite numbers");

    expect(() =>
      resolveCanonicalCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          "alt-a": {
            "criterion-1": [],
          },
        },
      })
    ).toThrow("must be a finite number or a non-empty array of finite numbers");

    expect(() =>
      resolveCanonicalCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          "alt-a": {
            "criterion-1": [0.6, "bad"],
          },
        },
      })
    ).toThrow("must be a finite number or a non-empty array of finite numbers");

    expect(() =>
      resolveCanonicalCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          "alt-c": {
            "criterion-1": 7.2,
          },
        },
      })
    ).toThrow("Collective payload contains unknown alternative rows.");

    expect(() =>
      resolveCanonicalCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          "alt-a": {
            "criterion-3": 7.2,
          },
        },
      })
    ).toThrow("Collective alternative row contains unknown criterion cells.");
  });
});
