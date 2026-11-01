import { describe, expect, it } from "vitest";

import { buildClassificationRelationshipVisualization } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildClassificationRelationshipVisualization.js";

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
