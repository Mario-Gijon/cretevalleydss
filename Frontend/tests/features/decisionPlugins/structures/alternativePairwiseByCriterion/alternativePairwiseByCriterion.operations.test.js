import { describe, expect, it, vi } from "vitest";

import { buildColumns } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/operations/buildColumns.js";
import { buildRows } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/operations/buildRows.js";
import { formatValue, getUnmatchedFuzzyTooltipText } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/operations/formatValue.js";
import { resolveCollective } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/operations/resolveCollective.js";
import { updateValue } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/operations/updateValue.js";
import { validateEvaluation } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/operations/validateEvaluation.js";

const alternatives = [
  { id: "alt-a", name: "Alternative A" },
  { id: "alt-b", name: "Alternative B" },
];

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
      { key: "custom", label: "Custom", values: [0.1, 0.3, 0.9], index: 1 },
      { key: "high", label: "High", values: [0.8, 1, 1], index: 2 },
    ],
  },
};

const buildCriteria = (expressionDomain = numericDomain) => [
  { id: "cost", name: "Cost", expressionDomain },
];

const buildEvaluation = (upperValue = 2, lowerValue = 4) => ({
  cost: {
    "alt-a": { "alt-b": upperValue },
    "alt-b": { "alt-a": lowerValue },
  },
});

describe("alternativePairwiseByCriterion operations", () => {
  it("builds DataGrid rows from direct values", () => {
    expect(
      buildRows({
        alternatives,
        evaluation: buildEvaluation().cost,
      })
    ).toEqual([
      {
        id: "alt-a",
        alternativeLabel: "Alternative A",
        "alt-b": 2,
      },
      {
        id: "alt-b",
        alternativeLabel: "Alternative B",
        "alt-a": 4,
      },
    ]);
  });

  it("builds columns with every non-diagonal cell editable", () => {
    const renderCell = vi.fn((cell) => cell);
    const columns = buildColumns({ alternatives, renderCell });

    expect(
      columns[2].renderCell({
        row: { id: "alt-a", "alt-b": 2 },
      })
    ).toEqual({
      rowAlternativeId: "alt-a",
      columnAlternativeId: "alt-b",
      value: 2,
      diagonal: false,
      editable: true,
    });
    expect(
      columns[1].renderCell({
        row: { id: "alt-a", "alt-b": 2 },
      })
    ).toMatchObject({
      diagonal: true,
      editable: false,
    });
    expect(
      columns[1].renderCell({
        row: { id: "alt-b", "alt-a": 4 },
      })
    ).toEqual({
      rowAlternativeId: "alt-b",
      columnAlternativeId: "alt-a",
      value: 4,
      diagonal: false,
      editable: true,
    });
  });

  it("validates the complete direct payload", () => {
    const evaluation = buildEvaluation();

    expect(
      validateEvaluation({
        alternatives,
        criteria: buildCriteria(),
        evaluation,
      })
    ).toBe(evaluation);
  });

  it("rejects the former value wrapper", () => {
    expect(() =>
      validateEvaluation({
        alternatives,
        criteria: buildCriteria(),
        evaluation: buildEvaluation({ value: 2 }, 4),
      })
    ).toThrow();
  });

  it("updates and clears both direct directions from either visual half", () => {
    const initialEvaluation = buildEvaluation("", "");
    const updated = updateValue({
      evaluation: initialEvaluation,
      alternatives,
      criterionId: "cost",
      rowAlternativeId: "alt-a",
      columnAlternativeId: "alt-b",
      nextValue: 2,
      expressionDomain: numericDomain,
    });

    expect(updated).toEqual(buildEvaluation());
    expect(initialEvaluation).toEqual(buildEvaluation("", ""));

    const lowerDirectionUpdated = updateValue({
      evaluation: updated,
      alternatives,
      criterionId: "cost",
      rowAlternativeId: "alt-b",
      columnAlternativeId: "alt-a",
      nextValue: 3,
      expressionDomain: numericDomain,
    });

    expect(lowerDirectionUpdated).toEqual(buildEvaluation(3, 3));

    expect(
      updateValue({
        evaluation: lowerDirectionUpdated,
        alternatives,
        criterionId: "cost",
        rowAlternativeId: "alt-b",
        columnAlternativeId: "alt-a",
        nextValue: "",
        expressionDomain: numericDomain,
      })
    ).toEqual(buildEvaluation("", ""));
  });

  it("rejects diagonal and unknown-alternative updates", () => {
    expect(() =>
      updateValue({
        evaluation: buildEvaluation(),
        alternatives,
        criterionId: "cost",
        rowAlternativeId: "alt-a",
        columnAlternativeId: "alt-a",
        nextValue: 2,
        expressionDomain: numericDomain,
      })
    ).toThrow("Pairwise updates cannot target diagonal values.");

    expect(() =>
      updateValue({
        evaluation: buildEvaluation(),
        alternatives,
        criterionId: "cost",
        rowAlternativeId: "unknown",
        columnAlternativeId: "alt-a",
        nextValue: 2,
        expressionDomain: numericDomain,
      })
    ).toThrow("Pairwise update references an unknown alternative.");
  });

  it("reflects ordinal and fuzzy values directly from either direction", () => {
    const ordinalResult = updateValue({
      evaluation: buildEvaluation("", ""),
      alternatives,
      criterionId: "cost",
      rowAlternativeId: "alt-a",
      columnAlternativeId: "alt-b",
      nextValue: { labelKey: "low" },
      expressionDomain: ordinalDomain,
    });
    const fuzzyResult = updateValue({
      evaluation: buildEvaluation("", ""),
      alternatives,
      criterionId: "cost",
      rowAlternativeId: "alt-a",
      columnAlternativeId: "alt-b",
      nextValue: { labelKey: "high" },
      expressionDomain: fuzzyDomain,
    });
    const ordinalLowerResult = updateValue({
      evaluation: buildEvaluation("", ""),
      alternatives,
      criterionId: "cost",
      rowAlternativeId: "alt-b",
      columnAlternativeId: "alt-a",
      nextValue: { labelKey: "high" },
      expressionDomain: ordinalDomain,
    });
    const fuzzyLowerResult = updateValue({
      evaluation: buildEvaluation("", ""),
      alternatives,
      criterionId: "cost",
      rowAlternativeId: "alt-b",
      columnAlternativeId: "alt-a",
      nextValue: { labelKey: "high" },
      expressionDomain: fuzzyDomain,
    });

    expect(ordinalResult.cost["alt-a"]["alt-b"]).toEqual({
      labelKey: "low",
    });
    expect(ordinalResult.cost["alt-b"]["alt-a"]).toEqual({
      labelKey: "high",
    });
    expect(fuzzyResult.cost["alt-a"]["alt-b"]).toEqual({
      labelKey: "high",
    });
    expect(fuzzyResult.cost["alt-b"]["alt-a"]).toEqual({
      values: [0, 0, 0.19999999999999996],
    });
    expect(ordinalLowerResult.cost["alt-b"]["alt-a"]).toEqual({
      labelKey: "high",
    });
    expect(ordinalLowerResult.cost["alt-a"]["alt-b"]).toEqual({
      labelKey: "low",
    });
    expect(fuzzyLowerResult.cost["alt-b"]["alt-a"]).toEqual({
      labelKey: "high",
    });
    expect(fuzzyLowerResult.cost["alt-a"]["alt-b"]).toEqual({
      values: [0, 0, 0.19999999999999996],
    });
  });

  it("formats matching and unmatched fuzzy direct values", () => {
    expect(
      formatValue({
        value: { values: [0, 0, 0.2] },
        expressionDomain: fuzzyDomain,
      })
    ).toEqual({
      text: "Low",
      tooltip: null,
    });
    expect(
      formatValue({
        value: { values: [0.09999999999999998, 0.7, 0.9] },
        expressionDomain: fuzzyDomain,
      })
    ).toEqual({
      text: "[0.1, 0.7, 0.9]",
      tooltip: getUnmatchedFuzzyTooltipText(),
    });
  });

  it("resolves a complete direct collective payload and rejects invalid shapes", () => {
    const collectiveEvaluation = buildEvaluation(2.5, 3.5);

    expect(
      resolveCollective({
        alternatives,
        criteria: buildCriteria(),
        collectiveEvaluation,
      })
    ).toBe(collectiveEvaluation);

    expect(() =>
      resolveCollective({
        alternatives,
        criteria: buildCriteria(),
        collectiveEvaluation: {
          cost: {
            "alt-a": { "alt-b": 2.5 },
          },
        },
      })
    ).toThrow("Collective pairwise payload is missing an alternative row.");
  });
});
