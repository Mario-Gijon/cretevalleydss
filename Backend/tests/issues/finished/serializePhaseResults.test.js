import { describe, expect, it } from "vitest";

import { buildResultStructureRegistry } from "../../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";
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

  it("preserves the complete ranking@1 Finished Issue projection", () => {
    const [phaseResult] = serializePhaseResults({
      alternatives: [
        { id: "alternative-1", name: "Alternative A" },
        { id: "alternative-2", name: "Duplicate" },
        { id: "alternative-3", name: "Duplicate" },
      ],
      phaseResults: [{
        _id: "phase-result-1",
        stage: "alternativeEvaluation",
        consensusPhase: 3,
        inputSnapshot: {
          expertWeights: [
            { expert: "expert-b", weight: 0.4 },
            { expert: "expert-a", weight: 0.6 },
          ],
        },
        result: {
          resultStructureKey: "ranking",
          resultStructureVersion: 1,
          standardResult: {
            consensusMeasure: 0.75,
            rankedAlternatives: [
              {
                alternativeId: "removed-alternative",
                name: "Alternative A",
                score: 0.812,
                rank: 1,
                classification: "  high  ",
                resultLabel: " High, leaning upward ",
              },
              {
                alternativeId: "alternative-2",
                name: "Duplicate",
                score: 0.6,
                rank: 2,
              },
              {
                alternativeId: "removed-duplicate",
                name: "Duplicate",
                score: 0.4,
                rank: 3,
              },
            ],
            collectiveEvaluations: { experts: { "expert-a": { value: 1 } } },
            plotsGraphic: { collective_point: [0.75] },
          },
          modelExecution: { executedAt: new Date("2026-02-03T10:11:12.000Z") },
          rawOutput: { trace: "raw" },
        },
        createdAt: new Date("2026-02-03T10:10:00.000Z"),
        updatedAt: new Date("2026-02-03T10:12:00.000Z"),
      }],
    });

    const firstRankedAlternative = {
      alternativeId: "alternative-1",
      name: "Alternative A",
      score: 0.812,
      rank: 1,
      classification: "high",
      resultLabel: "High, leaning upward",
    };
    const rankedAlternatives = [
      firstRankedAlternative,
      { alternativeId: "alternative-2", name: "Duplicate", score: 0.6, rank: 2 },
      { alternativeId: null, name: "Duplicate", score: 0.4, rank: 3 },
    ];

    expect(phaseResult).toEqual({
      id: "phase-result-1",
      stage: "alternativeEvaluation",
      phase: 3,
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
      consensusMeasure: 0.75,
      rankedAlternatives,
      collectiveEvaluationId: "phase-result-1",
      plotsGraphic: { collective_point: [0.75] },
      standardizedOutput: {
        rankedAlternatives,
        consensusMeasure: 0.75,
        collectiveEvaluations: { experts: { "expert-a": { value: 1 } } },
        plotsGraphic: { collective_point: [0.75] },
      },
      expertWeightSnapshot: [
        { expertId: "expert-a", weight: 0.6 },
        { expertId: "expert-b", weight: 0.4 },
      ],
      modelSpecificOutput: { executedAt: "2026-02-03T10:11:12.000Z" },
      rawOutput: { trace: "raw" },
      computedAt: "2026-02-03T10:11:12.000Z",
      createdAt: "2026-02-03T10:10:00.000Z",
      updatedAt: "2026-02-03T10:12:00.000Z",
    });
  });

  it("projects a non-ranking structure without manufacturing ranking fields", () => {
    const registry = buildResultStructureRegistry([{
      key: "synthetic-results",
      version: 1,
      validateAndNormalize: ({ result }) => result,
      projectNormalizedResult: ({ result, target }) => {
        if (target === "finishedIssuePhaseResult") {
          return { standardizedOutput: result };
        }
        throw new TypeError(`Unsupported synthetic projection '${target}'`);
      },
    }]);
    const standardizedResult = {
      assignments: [{ itemId: "item-1", group: "preferred" }],
      confidence: { level: 0.93 },
      customField: "preserved",
    };

    const [phaseResult] = serializePhaseResults({
      alternatives: [],
      registry,
      phaseResults: [{
        _id: "synthetic-phase-result",
        stage: "alternativeEvaluation",
        consensusPhase: 0,
        result: {
          resultStructureKey: "synthetic-results",
          resultStructureVersion: 1,
          standardResult: standardizedResult,
          modelExecution: {},
          rawOutput: {},
        },
      }],
    });

    expect(phaseResult).toMatchObject({
      resultStructureKey: "synthetic-results",
      resultStructureVersion: 1,
      standardizedOutput: standardizedResult,
    });
    expect(phaseResult).not.toHaveProperty("rankedAlternatives");
    expect(phaseResult.standardizedOutput).not.toHaveProperty("rankedAlternatives");
  });

  it("keeps criteriaWeighting on its existing contract without consulting the registry", () => {
    const registry = buildResultStructureRegistry([]);
    const [phaseResult] = serializePhaseResults({
      alternatives: [],
      registry,
      phaseResults: [{
        _id: "weights-phase-result",
        stage: "criteriaWeighting",
        consensusPhase: 0,
        result: {
          standardResult: {
            consensusMeasure: null,
            collectiveEvaluations: { weights: { criterion: 1 } },
            weightsByCriterion: { criterion: 1 },
          },
          modelExecution: {},
          rawOutput: {},
        },
      }],
    });

    expect(phaseResult).toMatchObject({
      stage: "criteriaWeighting",
      consensusMeasure: null,
      rankedAlternatives: [],
      collectiveEvaluationId: "weights-phase-result",
      plotsGraphic: {},
      standardizedOutput: {
        rankedAlternatives: [],
        consensusMeasure: null,
        collectiveEvaluations: { weights: { criterion: 1 } },
        weightsByCriterion: { criterion: 1 },
      },
    });
    expect(phaseResult).not.toHaveProperty("resultStructureKey");
  });

  it.each([
    [{ resultStructureKey: "missing", resultStructureVersion: 1 }, "Unsupported resultStructureKey"],
    [{ resultStructureKey: "ranking", resultStructureVersion: 99 }, "Unsupported resultStructureVersion"],
  ])("rejects incompatible persisted result metadata %j", (metadata, message) => {
    expect(() => serializePhaseResults({
      alternatives: [],
      phaseResults: [{
        _id: "phase-result-1",
        stage: "alternativeEvaluation",
        consensusPhase: 0,
        result: { ...metadata, standardResult: {}, modelExecution: {}, rawOutput: {} },
      }],
    })).toThrow(message);
  });
});
