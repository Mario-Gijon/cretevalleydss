import { describe, expect, it } from "vitest";

import { buildClassificationPatternProjectionVisualization, buildClassificationRelationshipVisualization } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildClassificationRelationshipVisualization.js";

const execution = (overrides = {}) => ({
  genericAnalysis: {
    facts: {
      expertCollectiveClassificationRelationship: {
        metric: "exact_category_match_rate",
        experts: [
          {
            expertId: "expert-ada",
            name: "Ada",
            exactCategoryMatches: 2,
            totalAlternatives: 3,
            matchRate: 2 / 3,
            disagreements: [{ alternative: "Beta", individualCategory: "Medium", collectiveCategory: "Low" }],
          },
          { expertId: "expert-grace", name: "Grace", exactCategoryMatches: 3, totalAlternatives: 3, matchRate: 1, disagreements: [] },
        ],
      },
    },
  },
  ...overrides,
});

describe("buildClassificationRelationshipVisualization", () => {
  it("maps validated saved category-match counts into an exact-percentage bar descriptor", () => {
    const descriptor = buildClassificationRelationshipVisualization(execution());

    expect(descriptor).toMatchObject({
      key: "expert-collective-classification-match",
      type: "bar",
      orientation: "horizontal",
      xAxis: { tickSuffix: "%" },
      valueAxis: { min: 0, max: 100 },
      presentation: { tooltip: { variant: "exact-category-match" } },
      data: {
        categories: ["Ada", "Grace"],
        series: [{ values: [(2 / 3) * 100, 100] }],
        details: [
          {
            exactCategoryMatches: 2,
            totalAlternatives: 3,
            disagreements: [{ alternative: "Beta", individualCategory: "Medium", collectiveCategory: "Low" }],
          },
          { exactCategoryMatches: 3, totalAlternatives: 3, disagreements: [] },
        ],
      },
    });
    expect(descriptor.data.series[0].values[0]).toBeCloseTo(66.6667);
    expect(descriptor.description).toContain("not a numeric distance");
    expect(JSON.stringify(descriptor)).not.toContain("expert-ada");
  });

  it.each([
    ["missing relationship", { genericAnalysis: { facts: {} } }],
    ["wrong metric", { genericAnalysis: { facts: { expertCollectiveClassificationRelationship: { metric: "distance", experts: [] } } } }],
    ["only one expert", { genericAnalysis: { facts: { expertCollectiveClassificationRelationship: { metric: "exact_category_match_rate", experts: [{ expertId: "one", name: "One", exactCategoryMatches: 1, totalAlternatives: 1, matchRate: 1 }] } } } }],
    ["inconsistent rate", { genericAnalysis: { facts: { expertCollectiveClassificationRelationship: { metric: "exact_category_match_rate", experts: [
      { expertId: "one", name: "One", exactCategoryMatches: 1, totalAlternatives: 2, matchRate: 0.9 },
      { expertId: "two", name: "Two", exactCategoryMatches: 2, totalAlternatives: 2, matchRate: 1 },
    ] } } } }],
    ["duplicate display names", { genericAnalysis: { facts: { expertCollectiveClassificationRelationship: { metric: "exact_category_match_rate", experts: [
      { expertId: "one", name: "Same", exactCategoryMatches: 1, totalAlternatives: 1, matchRate: 1 },
      { expertId: "two", name: "Same", exactCategoryMatches: 1, totalAlternatives: 1, matchRate: 1 },
    ] } } } }],
  ])("omits the chart for %s", (_label, override) => {
    expect(buildClassificationRelationshipVisualization(execution(override))).toBeNull();
  });
});

describe("buildClassificationPatternProjectionVisualization", () => {
  const projectionExecution = () => execution({
    genericAnalysis: {
      facts: {
        expertCollectiveClassificationRelationship: {
          metric: "exact_category_match_rate",
          experts: [],
          auxiliaryProjection: {
            type: "auxiliary_categorical_agreement_projection",
            dissimilarity: "normalized_hamming_category_mismatch",
            stress: 0.04,
            maximumStress: 0.15,
            points: [
              { kind: "expert", name: "A long expert display name which should stay available in the graph", x: -0.5, y: 0, exactCategoryMatches: 2, totalAlternatives: 3 },
              { kind: "expert", name: "Grace", x: 0, y: 0.5, exactCategoryMatches: 1, totalAlternatives: 3 },
              { kind: "expert", name: "Katherine", x: 0.5, y: 0, exactCategoryMatches: 2, totalAlternatives: 3 },
              { kind: "collective", name: "Collective result", x: 0, y: -0.5, exactCategoryMatches: 3, totalAlternatives: 3 },
            ],
          },
        },
      },
    },
  });

  it("maps only a validated low-stress categorical pattern projection into an auxiliary scatter descriptor", () => {
    const descriptor = buildClassificationPatternProjectionVisualization(projectionExecution());

    expect(descriptor).toMatchObject({
      key: "expert-collective-categorical-pattern-projection",
      type: "scatter",
      title: "Auxiliary categorical agreement-pattern projection",
      xAxis: { hideTickLabels: true },
      yAxis: { hideTickLabels: true },
      presentation: { tooltip: { variant: "categorical-pattern-projection" } },
    });
    expect(descriptor.description).toContain("not AHPSort distance or AHP priorities");
    expect(descriptor.data.series.map((series) => series.key)).toEqual(["experts", "collective"]);
    expect(descriptor.data.series[0].points[0]).toEqual({
      label: "A long expert display name which should stay available in the graph",
      x: -0.5,
      y: 0,
      details: { exactCategoryMatches: 2, totalAlternatives: 3, categoryMismatchCount: 1 },
    });
    expect(JSON.stringify(descriptor)).not.toContain("expertId");
  });

  it.each([
    ["stress above the supported limit", { stress: 0.2 }],
    ["a missing collective", { points: [{ kind: "expert", name: "Only expert", x: 0, y: 0, exactCategoryMatches: 3, totalAlternatives: 3 }] }],
  ])("omits an unreliable projection for %s", (_name, projectionOverride) => {
    const facts = projectionExecution().genericAnalysis.facts.expertCollectiveClassificationRelationship;
    facts.auxiliaryProjection = { ...facts.auxiliaryProjection, ...projectionOverride };
    expect(buildClassificationPatternProjectionVisualization({ genericAnalysis: { facts } })).toBeNull();
  });
});
