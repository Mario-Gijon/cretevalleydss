import mongoose from "mongoose";
import { describe, expect, it, vi } from "vitest";

import { IssueResultsAnalysis } from "../../../models/IssueResultsAnalyses.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import {
  getFinishedIssueGlobalAnalysis,
  getOrGenerateFinishedIssueExecutionAnalysis,
  reloadFinishedIssueExecutionAnalyses,
} from "../../../modules/issues/resultsAnalysis/index.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const fixture = () => {
  const issueId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const issue = { _id: issueId, ownerId: userId, active: false, currentStage: "finished" };
  return {
    issueId,
    userId,
    dependencies: {
      getIssue: vi.fn(async () => issue),
      historyBuilder: vi.fn(async () => ({ history: true })),
      analysisContextBuilder: vi.fn(() => ({ rounds: [], scenarios: { current: [] } })),
      executionProjector: vi.fn(({ executionKey }) => ({ execution: { key: executionKey }, analysisContext: { projectedFor: executionKey, rounds: [{ selectedExecution: { modelContext: { apiModelKey: executionKey === "base" ? "base-model" : "scenario-model" } } }] } })),
      requestModelAnalysis: vi.fn(async () => null),
    },
  };
};

describe("finished Issue execution analysis service", () => {
  it("generates missing Base analysis once, persists it, and reuses it through the legacy global endpoint", async () => {
    const { issueId, userId, dependencies } = fixture();
    const requestAnalysis = vi.fn(async () => ({ facts: { executions: 1 }, interpretation: "Base", visualizations: [] }));
    const common = { issueId, userId, requestAnalysis, now: () => new Date("2026-01-01T00:00:00.000Z"), ...dependencies };

    const first = await getOrGenerateFinishedIssueExecutionAnalysis({ executionKey: "base", ...common });
    const second = await getOrGenerateFinishedIssueExecutionAnalysis({ executionKey: "base", ...common });
    const global = await getFinishedIssueGlobalAnalysis(common);

    expect(first).toMatchObject({ executionKey: "base", executionType: "base", scenarioId: null, genericAnalysis: { interpretation: "Base" }, stageAnalyses: { alternativeEvaluation: { apiModelKey: "base-model", analysis: null } } });
    expect(second).toEqual(first);
    expect(global).toEqual(first.genericAnalysis);
    expect(requestAnalysis).toHaveBeenCalledTimes(1);
    expect(dependencies.historyBuilder).toHaveBeenCalledTimes(1);
  });

  it("replaces an analysis on reload and preserves requested execution order", async () => {
    const { issueId, userId, dependencies } = fixture();
    const scenarioId = new mongoose.Types.ObjectId();
    await IssueScenario.create({ issue: issueId, createdBy: userId, name: "Scenario", targetModel: new mongoose.Types.ObjectId(), config: { parameterOverrides: {} }, phaseResults: [{ phase: 0, source: { stageResult: null, domainType: "numeric" }, requestSnapshot: {}, result: { standardResult: {}, modelExecution: {}, rawOutput: {} }, execution: { attemptId: new mongoose.Types.ObjectId(), startedAt: new Date(), completedAt: new Date() } }] });
    const scenario = await IssueScenario.findOne({ issue: issueId }).lean();
    dependencies.analysisContextBuilder.mockReturnValue({ rounds: [], scenarios: { current: [{ id: String(scenario._id), phaseResults: [{}] }] } });
    const requestAnalysis = vi.fn(async ({ analysisContext }) => ({ facts: { key: analysisContext.projectedFor }, interpretation: `Analysis ${analysisContext.projectedFor}`, visualizations: [] }));
    const now = vi.fn().mockReturnValue(new Date("2026-01-04T00:00:00.000Z")).mockReturnValueOnce(new Date("2026-01-01T00:00:00.000Z")).mockReturnValueOnce(new Date("2026-01-02T00:00:00.000Z")).mockReturnValueOnce(new Date("2026-01-03T00:00:00.000Z"));
    const common = { issueId, userId, requestAnalysis, now, ...dependencies };

    await getOrGenerateFinishedIssueExecutionAnalysis({ executionKey: "base", ...common });
    await getOrGenerateFinishedIssueExecutionAnalysis({ executionKey: String(scenario._id), ...common });
    const reloaded = await reloadFinishedIssueExecutionAnalyses({ executionKeys: [String(scenario._id), "base"], ...common });

    expect(reloaded.map((entry) => entry.executionKey)).toEqual([String(scenario._id), "base"]);
    expect(reloaded[0].executionType).toBe("scenario");
    expect(await IssueResultsAnalysis.countDocuments({ issue: issueId })).toBe(2);
    expect(requestAnalysis).toHaveBeenCalledTimes(4);
  });

  it("rejects empty, oversized, and unavailable reload selections", async () => {
    const { issueId, userId, dependencies } = fixture();
    const common = { issueId, userId, requestAnalysis: vi.fn(), ...dependencies };

    await expect(reloadFinishedIssueExecutionAnalyses({ executionKeys: [], ...common })).rejects.toThrow(/between 1 and 3/);
    await expect(reloadFinishedIssueExecutionAnalyses({ executionKeys: ["base", "a", "b", "c"], ...common })).rejects.toThrow(/between 1 and 3/);
    await expect(reloadFinishedIssueExecutionAnalyses({ executionKeys: [String(new mongoose.Types.ObjectId())], ...common })).rejects.toThrow(/not available/);
  });
});
