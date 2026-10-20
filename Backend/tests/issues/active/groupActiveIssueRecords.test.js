import { describe, expect, it } from "vitest";
import { buildActiveIssueCollections } from "../../../modules/issues/active/groupActiveIssueRecords.js";
import {
  RESULT_STRUCTURE_REGISTRY,
  buildResultStructureRegistry,
} from "../../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";

describe("active issue result collection", () => {
  it("preserves a non-ranking result structure without requiring ranking fields", () => {
    const resultStructureRegistry = buildResultStructureRegistry([
      {
        key: "clusterSummary",
        version: 2,
        validateAndNormalize: ({ result }) => result,
      },
    ]);
    const standardResult = {
      consensusMeasure: 0.82,
      groups: [{ alternativeIds: ["alternative-a", "alternative-b"] }],
      summary: { groupCount: 1 },
    };
    const collections = buildActiveIssueCollections({
      participations: [],
      alternatives: [],
      criteria: [],
      alternativeStageResults: [
        {
          issue: "issue-1",
          stage: "alternativeEvaluation",
          consensusPhase: 1,
          createdAt: new Date("2026-10-20T12:00:00.000Z"),
          result: {
            resultStructureKey: "clusterSummary",
            resultStructureVersion: 2,
            standardResult,
            modelExecution: { kind: "decisionModelsService" },
            rawOutput: { trace: ["preserved"] },
          },
        },
      ],
      resultStructureRegistry,
    });

    expect(collections.consensusHistoryByIssue["issue-1"][0]).toMatchObject({
      resultStructureKey: "clusterSummary",
      resultStructureVersion: 2,
      standardResult,
      consensusLevel: 0.82,
      groups: standardResult.groups,
      summary: standardResult.summary,
    });
    expect(collections.consensusHistoryByIssue["issue-1"][0]).not.toHaveProperty(
      "rankedAlternatives"
    );
  });

  it("keeps the existing ranking consensus summary and feedback fields", () => {
    const standardResult = {
      consensusMeasure: 0.82,
      rankedAlternatives: [{ alternativeId: "alternative-a", name: "A", score: 1, rank: 1 }],
      collectiveEvaluations: { value: 1 },
    };
    const collections = buildActiveIssueCollections({
      participations: [],
      alternatives: [],
      criteria: [],
      alternativeStageResults: [
        {
          issue: "issue-2",
          consensusPhase: 1,
          createdAt: new Date("2026-10-20T12:00:00.000Z"),
          result: {
            resultStructureKey: "ranking",
            resultStructureVersion: 1,
            standardResult,
            modelExecution: { kind: "decisionModelsService" },
            rawOutput: { feedback: "Keep feedback", recommendations: ["Keep recommendation"] },
          },
        },
      ],
      resultStructureRegistry: RESULT_STRUCTURE_REGISTRY,
    });

    expect(collections.consensusHistoryByIssue["issue-2"][0]).toMatchObject({
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
      standardResult,
      consensusLevel: 0.82,
      rankedAlternatives: standardResult.rankedAlternatives,
      collectiveEvaluations: standardResult.collectiveEvaluations,
      feedback: "Keep feedback",
      recommendations: ["Keep recommendation"],
    });
  });
});
