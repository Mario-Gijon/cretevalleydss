import { describe, expect, it } from "vitest";

import {
  GENERIC_VISUALIZATION_READING_GUIDES,
  getVisualizationReadingGuide,
  MODEL_VISUALIZATION_READING_GUIDES,
} from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/visualizationReadingGuides.js";

const MODEL_CHART_KEYS = [
  "individual-preference-distribution",
  "collective-criterion-importance",
  "mcc-adjustment-map",
  "mcc-adjustment-effort-by-expert",
  "mcc-adjustment-effort-by-criterion",
  "two-tuple-collective-profile",
  "two-tuple-alpha-heatmap",
  "two-tuple-evaluator-distance",
  "two-tuple-evaluator-disagreement",
  "two-tuple-personal-vs-collective-ranking",
  "two-tuple-loeo-rank-impact",
  "topsis-ideal-distances",
  "topsis-collective-performance-profile",
  "topsis-numeric-ideal-distances",
  "topsis-sort-closeness-category-boundaries",
  "topsis-positive-distance-contributions",
  "topsis-negative-distance-contributions",
  "criterion-weighted-discrimination",
  "positive-distance-contributions",
  "negative-distance-contributions",
  "collective-beta-heatmap",
  "alpha-heatmap",
  "evaluator-alignment",
  "evaluator-disagreement-heatmap",
  "loeo-rank-impact",
  "loco-rank-impact",
];

const DYNAMIC_CHART_KEYS = [
  "two-tuple-criterion-weight-sensitivity-criterion-1",
  "two-tuple-expert-weight-sensitivity-expert-1",
  "criterion-weight-sensitivity-criterion-1",
  "evaluator-weight-sensitivity-expert-1",
  "topsis-sort-criterion-weight-sensitivity-price",
];

describe("visualization reading guides", () => {
  it("covers every fixed model visualization identifier with a specific guide", () => {
    expect(Object.keys(MODEL_VISUALIZATION_READING_GUIDES).sort()).toEqual([...MODEL_CHART_KEYS].sort());
    MODEL_CHART_KEYS.forEach((key) => {
      const { title, text } = getVisualizationReadingGuide({ key, type: "bar" });
      expect(title).not.toBe("Visualization");
      expect(text.split(/\s+/).length).toBeGreaterThanOrEqual(20);
      expect(text.split(/\s+/).length).toBeLessThanOrEqual(55);
    });
  });

  it("covers dynamic sensitivity identifiers by their stable semantic prefixes", () => {
    DYNAMIC_CHART_KEYS.forEach((key) => {
      const readingGuide = getVisualizationReadingGuide({ key, type: "line" });
      expect(readingGuide.text).toContain("Each line follows");
      expect(readingGuide.text).toContain("sampled");
    });
    expect(getVisualizationReadingGuide({ key: DYNAMIC_CHART_KEYS[0], type: "line" }).text).toContain("linguistic position (β)");
    expect(getVisualizationReadingGuide({ key: DYNAMIC_CHART_KEYS[2], type: "line" }).text).toContain("TOPSIS closeness");
  });

  it("keeps fixed, dynamic, and generic guides concise", () => {
    const texts = [
      ...Object.values(MODEL_VISUALIZATION_READING_GUIDES).map(({ text }) => text),
      ...Object.values(GENERIC_VISUALIZATION_READING_GUIDES).map(({ text }) => text),
      ...DYNAMIC_CHART_KEYS.map((key) => getVisualizationReadingGuide({ key }).text),
    ];
    texts.forEach((text) => {
      expect(text.split(/\s+/).length).toBeGreaterThanOrEqual(20);
      expect(text.split(/\s+/).length).toBeLessThanOrEqual(55);
    });
  });

  it("provides separate semantic guides for the generic charts", () => {
    expect(Object.keys(GENERIC_VISUALIZATION_READING_GUIDES).sort()).toEqual([
      "alternativeRelationships",
      "rankingAgreement",
      "rankingEvolution",
      "rankingStability",
    ]);
    expect(getVisualizationReadingGuide({ type: "alternativeRelationships" }).text).toContain("not a percentage of superiority or preference");
    expect(getVisualizationReadingGuide({ type: "rankingEvolution" }).text).toContain("1 is best");
    expect(getVisualizationReadingGuide({ type: "rankingStability" }).text).toContain("starting and ending rank");
    expect(getVisualizationReadingGuide({ type: "rankingAgreement" }).text).toContain("near −1 means it reversed");
  });

  it("explains linguistic scale, MCC direction, TOPSIS reference positions, and distance contributions", () => {
    expect(getVisualizationReadingGuide({ key: "individual-preference-distribution" }).text).toContain("side-to-side offsets");
    expect(getVisualizationReadingGuide({ key: "mcc-adjustment-map" }).text).toContain("negative means lowered");
    expect(getVisualizationReadingGuide({ key: "collective-beta-heatmap" }).text).toContain("may not be more desirable for a cost criterion");
    expect(getVisualizationReadingGuide({ key: "topsis-ideal-distances" }).text).toContain("most desirable reference");
    expect(getVisualizationReadingGuide({ key: "topsis-numeric-ideal-distances" }).text).toContain("Smaller D+ means closer");
    expect(getVisualizationReadingGuide({ key: "topsis-sort-closeness-category-boundaries" }).text).toContain("does not predict reclassification");
    expect(getVisualizationReadingGuide({ key: "topsis-positive-distance-contributions" }).text).toContain("not an additive effect on relative closeness");
    expect(getVisualizationReadingGuide({ key: "topsis-negative-distance-contributions" }).text).toContain("squared distance from the least desirable reference");
    expect(getVisualizationReadingGuide({ key: "loco-rank-impact" }).text).toContain("not real-world causal importance");
  });

  it("uses safe fallbacks for older descriptors with missing or malformed descriptions", () => {
    expect(getVisualizationReadingGuide({ key: "mcc-adjustment-map", description: null }).text).toContain("Rows are experts");
    expect(getVisualizationReadingGuide({ type: "bar", description: { malformed: true } }).text).toContain("Use the chart labels");
    expect(getVisualizationReadingGuide(null).text).toContain("Use the chart labels");
  });

  it("does not guess an unknown model chart's meaning from its renderer type", () => {
    expect(getVisualizationReadingGuide({ key: "unknown-bar", type: "bar", description: "Legacy chart detail" }).text).toBe("Legacy chart detail");
  });
});
