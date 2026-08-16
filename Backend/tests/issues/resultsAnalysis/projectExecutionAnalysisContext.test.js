import { describe, expect, it } from "vitest";

import { projectExecutionAnalysisContext } from "../../../modules/issues/resultsAnalysis/index.js";

const context = () => ({
  issue: { id: "issue-1", consensus: { enabled: true, threshold: 0.8 } },
  participants: { current: [] },
  semanticDirectory: { alternativesById: {} },
  rounds: [
    { phase: 0, start: { participants: [{ id: "expert-1" }] }, revisions: [{ id: "real-phase-0" }], executionAttempts: [{ id: "base-0", status: "succeeded", applicationStatus: "applied" }], selectedExecution: { attemptId: "base-0", result: { standardResult: { rankedAlternatives: [{ alternativeId: "a", rank: 2 }], consensusMeasure: 0.4 } } } },
    { phase: 5, start: { participants: [{ id: "expert-2" }] }, revisions: [{ id: "real-phase-5" }], executionAttempts: [{ id: "base-5", status: "succeeded", applicationStatus: "applied" }], selectedExecution: { attemptId: "base-5", result: { standardResult: { rankedAlternatives: [{ alternativeId: "a", rank: 1 }], consensusMeasure: 0.95 } } } },
  ],
  scenarios: {
    current: [{
      id: "scenario-1",
      phaseResults: [
        { phase: 5, attemptId: "scenario-5", startedAt: "2026-01-01T00:00:05.000Z", completedAt: "2026-01-01T00:00:06.000Z", execution: { attemptId: "scenario-5", startedAt: "2026-01-01T00:00:05.000Z", completedAt: "2026-01-01T00:00:06.000Z", modelContext: { apiModelKey: "scenario" }, input: { evaluations: [] }, result: { standardResult: { rankedAlternatives: [{ alternativeId: "a", rank: 2 }], consensusMeasure: 0.8 }, modelExecution: {} }, application: { entityType: "scenario" } } },
        { phase: 0, attemptId: "scenario-0", startedAt: "2026-01-01T00:00:01.000Z", completedAt: "2026-01-01T00:00:02.000Z", execution: { attemptId: "scenario-0", startedAt: "2026-01-01T00:00:01.000Z", completedAt: "2026-01-01T00:00:02.000Z", modelContext: { apiModelKey: "scenario" }, input: { evaluations: [] }, result: { standardResult: { rankedAlternatives: [{ alternativeId: "a", rank: 1 }], consensusMeasure: 0.5 }, modelExecution: {} }, application: { entityType: "scenario" } } },
      ],
    }],
  },
});

describe("projectExecutionAnalysisContext", () => {
  it("keeps Base rounds unchanged", () => {
    const input = context();
    const projected = projectExecutionAnalysisContext({ analysisContext: input, executionKey: "base" });

    expect(projected.execution).toEqual({ key: "base", type: "base", scenarioId: null });
    expect(projected.analysisContext.rounds).toEqual(input.rounds);
  });

  it("projects every Scenario phase in ascending order with real phase history", () => {
    const projected = projectExecutionAnalysisContext({ analysisContext: context(), executionKey: "scenario-1" });

    expect(projected.execution).toEqual({ key: "scenario-1", type: "scenario", scenarioId: "scenario-1" });
    expect(projected.analysisContext.rounds.map((entry) => entry.phase)).toEqual([0, 5]);
    expect(projected.analysisContext.rounds.map((entry) => entry.selectedExecution.attemptId)).toEqual(["scenario-0", "scenario-5"]);
    expect(projected.analysisContext.rounds.map((entry) => entry.selectedExecution.result.standardResult.rankedAlternatives[0].rank)).toEqual([1, 2]);
    expect(projected.analysisContext.rounds[1].start.participants).toEqual([{ id: "expert-2" }]);
    expect(projected.analysisContext.rounds[1].revisions).toEqual([{ id: "real-phase-5" }]);
  });

  it("rejects an unavailable Scenario execution key", () => {
    expect(() => projectExecutionAnalysisContext({ analysisContext: context(), executionKey: "missing" })).toThrow(/not available/);
  });
});
