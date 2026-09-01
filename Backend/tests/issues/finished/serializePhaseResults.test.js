import { describe, expect, it } from "vitest";

import { serializePhaseResults } from "../../../modules/issues/finished/finishedPayload/serializers/serializePhaseResults.js";

const serialize = (entry) => serializePhaseResults({
  alternatives: [{ id: "alternative-1", name: "Alternative A" }],
  phaseResults: [{
    _id: "phase-result-1",
    stage: "alternativeEvaluation",
    consensusPhase: 0,
    inputSnapshot: { expertWeights: [] },
    result: {
      standardResult: {
        rankedAlternatives: [entry],
        collectiveEvaluations: {},
        plotsGraphic: {},
        consensusMeasure: null,
      },
      modelExecution: {},
      rawOutput: {},
    },
  }],
})[0];

describe("Finished Issue phase-result ranking serialization", () => {
  it("preserves a canonical optional classification id", () => {
    expect(serialize({
      alternativeId: "alternative-1",
      name: "Alternative A",
      score: 0.812,
      rank: 1,
      classification: "high",
    }).rankedAlternatives).toEqual([{
      alternativeId: "alternative-1",
      name: "Alternative A",
      score: 0.812,
      rank: 1,
      classification: "high",
    }]);
  });

  it("does not invent classification when it is absent", () => {
    expect(serialize({
      alternativeId: "alternative-1",
      name: "Alternative A",
      score: 0.812,
      rank: 1,
    }).rankedAlternatives[0]).not.toHaveProperty("classification");
  });

  it("preserves an optional result label", () => {
    expect(serialize({
      alternativeId: "alternative-1",
      name: "Alternative A",
      score: 3.1465,
      rank: 1,
      resultLabel: "High, slightly leaning toward Very High",
    }).rankedAlternatives[0]).toMatchObject({
      resultLabel: "High, slightly leaning toward Very High",
    });
  });
});
