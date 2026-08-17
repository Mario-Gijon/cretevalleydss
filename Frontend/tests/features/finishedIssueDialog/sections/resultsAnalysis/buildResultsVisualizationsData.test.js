import { describe, expect, it } from "vitest";

import {
  alignProjectionToReference,
  areAnalyticalProjectionsEquivalent,
  buildCanonicalAnalyticalProjection,
  formatComparisonLegendLabel,
  buildResultsVisualizationsData,
} from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildResultsVisualizationsData.js";
import { buildComparativeAnalyticalScatterData } from "../../../../../src/features/finishedIssueDialog/graphs/logic/buildComparativeAnalyticalScatterData.js";
import { collectiveColorFor } from "../../../../../src/features/finishedIssueDialog/graphs/logic/analyticalScatterColors.js";

const colors = ["#27d5e4", "#6fdc68", "#a960e8"];
const execution = ({ key, points, collective = [0, 0], labels = ["a@example.test", "b@example.test"], rawOutput, modelSpecificOutput, color = colors[["base", "scenario-a", "scenario-b"].indexOf(key)], name = key, displayLabel = key }) => ({
  key,
  name,
  displayLabel,
  modelName: "Model",
  color,
  standardizedOutput: { plotsGraphic: { expert_points: points, collective_point: collective, expert_labels: labels } },
  rawOutput,
  modelSpecificOutput,
});

const payload = { consensus: { enabled: false }, phaseResults: [] };

describe("Results Analysis analytical projection comparison", () => {
  it("uses only standardized plotsGraphic, reconstructs absolute experts, and preserves zeros", () => {
    const result = buildCanonicalAnalyticalProjection({ execution: execution({ key: "base", points: [[0, -1], [2, 0]], collective: [3, 4], rawOutput: { expert_points: [[99, 99]] }, modelSpecificOutput: { expert_points: [[88, 88]] } }) });
    expect(result).toMatchObject({ available: true, expertPoints: [{ identity: "a@example.test", x: 3, y: 3 }, { identity: "b@example.test", x: 5, y: 4 }], collectivePoint: { x: 3, y: 4 } });
  });

  it("uses the persisted Generic Analysis projection for one execution when its standardized result has none", () => {
    const result = buildResultsVisualizationsData({
      payload,
      executions: [{
        ...execution({ key: "base", points: [] }),
        standardizedOutput: { plotsGraphic: {} },
        genericAnalysis: {
          facts: {
            expertCollectiveRelationship: {
              projection: {
                expert_points: [[0, -1], [2, 0]],
                collective_point: [3, 4],
                expert_labels: ["a@example.test", "b@example.test"],
              },
            },
          },
        },
      }],
    });

    expect(result.singleScatter).toMatchObject({
      available: true,
      data: { 0: { collectivePoint: { x: 3, y: 4 } } },
    });
  });

  it("prefers stored expert ids over emails and labels for stable matching", () => {
    const result = buildCanonicalAnalyticalProjection({ execution: {
      key: "base", name: "base", displayLabel: "base", color: colors[0],
      standardizedOutput: { plotsGraphic: { expert_points: [[0, 0], [1, 1]], collective_point: [0, 0], expert_ids: ["expert-2", "expert-1"], expert_emails: ["second@example.test", "first@example.test"], expert_labels: ["Second", "First"] } },
    } });
    expect(result.expertPoints.map((point) => point.identity)).toEqual(["expert-1", "expert-2"]);
    expect(result.expertPoints.map((point) => point.email)).toEqual(["first@example.test", "second@example.test"]);
  });

  it("detects equivalent projections independently of expert order and includes the collective point", () => {
    const first = buildCanonicalAnalyticalProjection({ execution: execution({ key: "base", points: [[1, 2], [3, 4]] }) });
    const reordered = buildCanonicalAnalyticalProjection({ execution: execution({ key: "scenario-a", points: [[3, 4], [1, 2]], labels: ["b@example.test", "a@example.test"] }) });
    const changedCollective = buildCanonicalAnalyticalProjection({ execution: execution({ key: "scenario-b", points: [[1, 2], [3, 4]], collective: [0.001, 0] }) });
    expect(areAnalyticalProjectionsEquivalent(first, reordered)).toBe(true);
    expect(areAnalyticalProjectionsEquivalent(first, changedCollective)).toBe(false);
  });

  it("aligns translation, rotation, reflection and scale without mutating source points", () => {
    const reference = buildCanonicalAnalyticalProjection({ execution: execution({ key: "base", points: [[0, 0], [2, 0], [0, 2]], labels: ["a", "b", "c"] }) });
    // Candidate is a reflected, rotated and scaled version of the reference.
    const candidate = buildCanonicalAnalyticalProjection({ execution: execution({ key: "scenario-a", points: [[4, -2], [4, -6], [8, -2]], collective: [10, 10], labels: ["a", "b", "c"] }) });
    const before = JSON.stringify(candidate);
    const result = alignProjectionToReference({ reference, candidate });
    expect(result.available).toBe(true);
    expect(result.diagnostics.rmsResidual).toBeLessThan(1e-9);
    expect(JSON.stringify(candidate)).toBe(before);
    expect(result.alignedProjection.collectivePoint.x).toBeTypeOf("number");
  });

  it("rejects degenerate anchor sets for alignment without making a projection unavailable", () => {
    const reference = buildCanonicalAnalyticalProjection({ execution: execution({ key: "base", points: [[0, 0], [0, 0]] }) });
    const candidate = buildCanonicalAnalyticalProjection({ execution: execution({ key: "scenario-a", points: [[1, 1], [1, 1]] }) });
    expect(alignProjectionToReference({ reference, candidate })).toMatchObject({ available: false, unavailableReason: "degenerate_alignment_anchors" });
    expect(buildCanonicalAnalyticalProjection({ execution: execution({ key: "scenario-b", points: [[1, 2], [3, 4]], labels: [] }) }).available).toBe(true);
  });

  it("groups partially identical projections and gives the earliest selected execution its color", () => {
    const result = buildResultsVisualizationsData({ payload, executions: [execution({ key: "base", points: [[1, 0], [0, 1]] }), execution({ key: "scenario-a", points: [[1, 0], [0, 1]] }), execution({ key: "scenario-b", points: [[2, 0], [0, 2]] })] });
    expect(result.expertCollectiveComparison.presentation).toBe("aligned-overlay");
    expect(result.expertCollectiveComparison.alignedExecutions).toHaveLength(2);
    expect(result.expertCollectiveComparison.alignedExecutions[0]).toMatchObject({ color: "#27d5e4", representedExecutions: [{ key: "base" }, { key: "scenario-a" }] });
  });

  it("uses shared presentation for all equal projections and a safe separate fallback for incompatible identities", () => {
    const shared = buildResultsVisualizationsData({ payload, executions: [execution({ key: "base", points: [[1, 0], [0, 1]] }), execution({ key: "scenario-a", points: [[1, 0], [0, 1]] })] });
    expect(shared.expertCollectiveComparison).toMatchObject({ presentation: "shared", footerMessage: "base and scenario-a have the same expert and collective points for this visualization." });
    const separate = buildResultsVisualizationsData({ payload, executions: [execution({ key: "base", points: [[1, 0], [0, 1]] }), execution({ key: "scenario-a", points: [[1, 0], [0, 1]], labels: ["different-a", "different-b"] })] });
    expect(separate.expertCollectiveComparison.presentation).toBe("separate");
  });

  it("groups three zero-only identical projections before any degenerate alignment check", () => {
    const result = buildResultsVisualizationsData({ payload, executions: [
      execution({ key: "base", points: [[0, 0], [0, 0]], labels: [] }),
      execution({ key: "scenario-a", points: [[0, 0], [0, 0]], labels: [] }),
      execution({ key: "scenario-b", points: [[0, 0], [0, 0]], labels: [] }),
    ] });
    expect(result.expertCollectiveComparison).toMatchObject({ presentation: "shared", groups: [{ representedExecutions: [{ key: "base" }, { key: "scenario-a" }, { key: "scenario-b" }] }] });
    expect(result.expertCollectiveComparison.separateExecutions).toEqual([]);
    expect(result.expertCollectiveComparison.footerMessage).toContain("same expert and collective points");
  });

  it("uses Base as a group representative even when it was selected after an identical scenario", () => {
    const result = buildResultsVisualizationsData({ payload, executions: [
      execution({ key: "scenario-a", points: [[1, 0], [0, 1]], color: "#27d5e4" }),
      execution({ key: "base", points: [[1, 0], [0, 1]], color: "#6fdc68" }),
    ] });
    expect(result.expertCollectiveComparison.sharedProjection).toMatchObject({ representative: { key: "base" }, color: "#6fdc68" });
  });

  it("uses unique groups in a degenerate separate fallback", () => {
    const result = buildResultsVisualizationsData({ payload, executions: [
      execution({ key: "base", points: [[0, 0], [0, 0]] }),
      execution({ key: "scenario-a", points: [[0, 0], [0, 0]] }),
      execution({ key: "scenario-b", points: [[1, 1], [1, 1]] }),
    ] });
    expect(result.expertCollectiveComparison).toMatchObject({ presentation: "separate", separateExecutions: [{ representedExecutions: [{ key: "base" }, { key: "scenario-a" }] }, { representedExecutions: [{ key: "scenario-b" }] }] });
    expect(result.expertCollectiveComparison.footerMessage).toBe("The different stored projections could not be aligned safely, so each unique projection is shown separately.");
  });

  it("uses exactly Experts and Collective for a fully shared projection legend", () => {
    const result = buildResultsVisualizationsData({ payload, executions: [
      execution({ key: "base", name: "Base", displayLabel: "Base · TOPSIS", points: [[1, 0], [0, 1]] }),
      execution({ key: "scenario-a", name: "Scenario A", displayLabel: "Scenario A · BORDA", points: [[1, 0], [0, 1]] }),
    ] });
    const data = buildComparativeAnalyticalScatterData({ groups: [result.expertCollectiveComparison.sharedProjection] });
    expect(data.datasets.map((dataset) => dataset.label)).toEqual(["Experts", "Collective"]);
    expect(data.datasets[0].data[0].executionLabel).toBe("Base · TOPSIS and Scenario A · BORDA");
  });

  it("uses concise natural execution names for partially shared groups and disambiguates duplicate names", () => {
    const result = buildResultsVisualizationsData({ payload, executions: [
      execution({ key: "base", name: "Base", displayLabel: "Base · TOPSIS", points: [[1, 0], [0, 1]] }),
      execution({ key: "scenario-a", name: "Scenario A", displayLabel: "Scenario A · BORDA", points: [[1, 0], [0, 1]] }),
      execution({ key: "scenario-b", name: "Scenario B", displayLabel: "Scenario B · MARCOS", points: [[2, 0], [0, 2]] }),
    ] });
    expect(buildComparativeAnalyticalScatterData({ groups: result.expertCollectiveComparison.alignedExecutions }).datasets.map((dataset) => dataset.label)).toEqual([
      "Experts — Base and Scenario A", "Collective — Base and Scenario A", "Experts — Scenario B", "Collective — Scenario B",
    ]);
    const duplicate = buildResultsVisualizationsData({ payload, executions: [
      execution({ key: "base", name: "Test", displayLabel: "Test · TOPSIS", points: [[1, 0], [0, 1]] }),
      execution({ key: "scenario-a", name: "Test", displayLabel: "Test · BORDA", points: [[1, 0], [0, 1]] }),
      execution({ key: "scenario-b", name: "Other", displayLabel: "Other · MARCOS", points: [[2, 0], [0, 2]] }),
    ] });
    expect(duplicate.expertCollectiveComparison.alignedExecutions[0].groupLabel).toBe("Test · TOPSIS and Test · BORDA");
    expect(formatComparisonLegendLabel([
      { executionName: "Scenario A", displayLabel: "Scenario A · TOPSIS" },
      { executionName: "Scenario B", displayLabel: "Scenario B · BORDA" },
      { executionName: "Scenario C", displayLabel: "Scenario C · MARCOS" },
    ])).toBe("Scenario A, Scenario B, and Scenario C");
  });

  it("uses a darker version of every execution color for Collective datasets", () => {
    const group = {
      color: "#27d5e4",
      representedExecutions: [{ key: "base" }],
      groupLabel: "Base",
      tooltipLabel: "Base · TOPSIS",
      expertPoints: [{ x: 0, y: 0, label: "Expert" }],
      collectivePoint: { x: 1, y: 1 },
    };
    const datasets = buildComparativeAnalyticalScatterData({ groups: [group] }).datasets;
    expect(datasets[0]).toMatchObject({ pointStyle: "circle", backgroundColor: "rgba(39, 213, 228, 0.68)" });
    expect(datasets[1]).toMatchObject({ pointStyle: "rectRot", backgroundColor: expect.stringContaining("rgba"), borderColor: "rgba(39, 213, 228, 0.95)", borderWidth: 2 });
    expect(datasets[1].backgroundColor).not.toBe(datasets[0].backgroundColor);
    expect(collectiveColorFor("#6fdc68")).not.toBe("#6fdc68");
  });
});
