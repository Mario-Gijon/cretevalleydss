import { describe, expect, it } from "vitest";

import { buildModelAnalysisSections, scopedEntities, visualizationsForScope } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/modelAnalysisSections.js";

const execution = (key, sections) => ({ key, alternativeEvaluationAnalysis: { analysis: { sections } } });

describe("model analysis semantic sections", () => {
  it("orders declared sections and preserves legacy flat visualizations", () => {
    const sections = buildModelAnalysisSections([
      execution("base", [{ id: "later", title: "Later", order: 2, visualizations: [{ key: "b" }] }, { id: "first", title: "First", order: 1, visualizations: [{ key: "a" }] }]),
      { key: "legacy", alternativeEvaluationAnalysis: { analysis: { visualizations: [{ key: "legacy" }] } } },
    ]);
    expect(sections.map((section) => section.id)).toEqual(["legacy-model-analysis", "first", "later"]);
    expect(sections.find((section) => section.id === "first").visualizations.map((entry) => entry.key)).toEqual(["a"]);
  });

  it("selects sections from the requested model-analysis stage without changing the legacy alternative stage", () => {
    const executions = [{
      key: "base",
      stageAnalyses: {
        criteriaWeighting: { analysis: { sections: [{ id: "weights", title: "Weights", visualizations: [{ key: "weight-chart" }] }] } },
        alternativeEvaluation: { analysis: { sections: [{ id: "ranking", title: "Ranking", visualizations: [{ key: "ranking-chart" }] }] } },
      },
    }];
    expect(buildModelAnalysisSections(executions, "criteriaWeighting").map((section) => section.id)).toEqual(["weights"]);
    expect(buildModelAnalysisSections(executions).map((section) => section.id)).toEqual(["ranking"]);
  });

  it("groups repeated scoped views by entity and filters all graphs for the selected entity", () => {
    const section = {
      executions: [{ visualizations: [
        { key: "distance-a", scope: { dimension: "expert", id: "a", label: "Admin", order: 0 } },
        { key: "consistency-a", scope: { dimension: "expert", id: "a", label: "Admin", order: 0 } },
        { key: "distance-b", scope: { dimension: "expert", id: "b", label: "Bea", order: 1 } },
      ] }],
    };
    const entities = scopedEntities(section);
    expect(entities.map((entity) => entity.label)).toEqual(["Admin", "Bea"]);
    expect(visualizationsForScope(section.executions[0].visualizations, entities[0]).map((entry) => entry.key)).toEqual(["distance-a", "consistency-a"]);
  });

  it("preserves a model-owned stacked presentation independently from scoped entity selection", () => {
    const [section] = buildModelAnalysisSections([
      execution("base", [{
        id: "criterion-weight-sensitivity",
        title: "Criterion weight sensitivity",
        order: 0,
        presentation: { layout: "stacked" },
        visualizations: [
          { key: "criterion-a", scope: { dimension: "criterion", id: "a", label: "A", order: 0 } },
          { key: "criterion-b", scope: { dimension: "criterion", id: "b", label: "B", order: 1 } },
        ],
      }]),
    ]);

    expect(section.presentation).toEqual({ layout: "stacked" });
    expect(visualizationsForScope(section.executions[0].visualizations, scopedEntities(section)[1]).map((entry) => entry.key)).toEqual(["criterion-b"]);
  });

  it("keeps model-analysis executions with different compatibility keys in separate sections", () => {
    const sections = buildModelAnalysisSections([
      execution("base", [{
        id: "sensitivity",
        title: "Criterion weight sensitivity",
        order: 0,
        presentation: { comparisonKey: "input-a", scopeSelector: "criterion" },
        visualizations: [{ key: "base-price", scope: { dimension: "criterion", id: "price", label: "Price", order: 0 } }],
      }]),
      execution("scenario", [{
        id: "sensitivity",
        title: "Criterion weight sensitivity",
        order: 0,
        presentation: { comparisonKey: "input-b", scopeSelector: "criterion" },
        visualizations: [{ key: "scenario-price", scope: { dimension: "criterion", id: "price", label: "Price", order: 0 } }],
      }]),
    ]);

    expect(sections).toHaveLength(2);
    expect(sections.map((section) => section.executions.map((entry) => entry.execution.key))).toEqual([
      ["base"],
      ["scenario"],
    ]);
    expect(new Set(sections.map((section) => section.id)).size).toBe(2);
  });

  it("hides only the retired AHPSort I classifications descriptor in stored analyses", () => {
    const sections = buildModelAnalysisSections([
      execution("historical-ahp", [
        {
          id: "ahp-sort-i-original-classifications",
          title: "AHPSort I classifications",
          visualizations: [{ key: "ahp-sort-i-original-classifications", type: "scatter" }],
        },
        {
          id: "ahp-sort-i-criterion-weight-sensitivity",
          title: "Criterion weight sensitivity",
          visualizations: [{ key: "ahp-sort-i-criterion-weight-sensitivity-quality", type: "line" }],
        },
        {
          id: "expert-collective-relationship",
          title: "Expert–collective relationship",
          visualizations: [{ key: "ahp-sort-i-classification-pattern-projection", type: "scatter" }],
        },
      ]),
      {
        key: "legacy-analysis",
        alternativeEvaluationAnalysis: {
          analysis: {
            visualizations: [
              { key: "ahp-sort-i-original-classifications", type: "scatter" },
              { key: "topsis-sort-expert-map", type: "scatter" },
            ],
          },
        },
      },
    ]);

    expect(sections.map((section) => section.title)).toEqual([
      "Criterion weight sensitivity",
      "Model analysis",
      "Expert–collective relationship",
    ]);
    expect(sections.flatMap((section) => section.executions.flatMap((entry) => entry.visualizations))
      .map((visualization) => visualization.key)).not.toContain("ahp-sort-i-original-classifications");
    expect(sections.find((section) => section.title === "Criterion weight sensitivity")).toBeTruthy();
    expect(sections.find((section) => section.title === "Expert–collective relationship")).toBeTruthy();
    expect(sections.find((section) => section.title === "Model analysis").executions
      .find((entry) => entry.execution.key === "legacy-analysis").visualizations)
      .toEqual([{ key: "topsis-sort-expert-map", type: "scatter" }]);
  });
});
