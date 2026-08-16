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
    expect(dependencies.requestModelAnalysis).toHaveBeenCalledWith(expect.objectContaining({ apiModelKey: "base-model" }));
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

  it("uses each projected Base and Scenario context with its own model key", async () => {
    const { issueId, userId, dependencies } = fixture();
    const scenarioId = new mongoose.Types.ObjectId();
    await IssueScenario.create({ issue: issueId, createdBy: userId, name: "Scenario", targetModel: new mongoose.Types.ObjectId(), config: { parameterOverrides: {} }, phaseResults: [{ phase: 0, source: { stageResult: null, domainType: "numeric" }, requestSnapshot: {}, result: { standardResult: {}, modelExecution: {}, rawOutput: {} }, execution: { attemptId: new mongoose.Types.ObjectId(), startedAt: new Date(), completedAt: new Date() } }] });
    const baseContext = { projectedFor: "base", rounds: [{ selectedExecution: { modelContext: { apiModelKey: "base-model" } } }] };
    const scenarioContext = { projectedFor: String(scenarioId), rounds: [{ selectedExecution: { modelContext: { apiModelKey: "scenario-model" } } }] };
    dependencies.executionProjector.mockImplementation(({ executionKey }) => ({ execution: { key: executionKey }, analysisContext: executionKey === "base" ? baseContext : scenarioContext }));
    const requestAnalysis = vi.fn(async ({ analysisContext }) => ({ facts: {}, interpretation: `General ${analysisContext.projectedFor}`, visualizations: [] }));
    const requestModelAnalysis = vi.fn(async ({ apiModelKey, analysisContext }) => ({ facts: {}, interpretation: `${apiModelKey}:${analysisContext.projectedFor}`, visualizations: [] }));
    const common = { issueId, userId, ...dependencies, requestAnalysis, requestModelAnalysis };

    const entries = await reloadFinishedIssueExecutionAnalyses({ executionKeys: ["base", String(scenarioId)], ...common });

    expect(requestModelAnalysis).toHaveBeenCalledWith({ apiModelKey: "base-model", analysisContext: baseContext });
    expect(requestModelAnalysis).toHaveBeenCalledWith({ apiModelKey: "scenario-model", analysisContext: scenarioContext });
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ executionKey: "base", stageAnalyses: { alternativeEvaluation: { apiModelKey: "base-model", analysis: expect.objectContaining({ interpretation: "base-model:base" }) } } }),
      expect.objectContaining({ executionKey: String(scenarioId), stageAnalyses: { alternativeEvaluation: { apiModelKey: "scenario-model", analysis: expect.objectContaining({ interpretation: `scenario-model:${scenarioId}` }) } } }),
    ]));
  });

  it("keeps model analyses isolated when reloading multiple executions", async () => {
    const { issueId, userId, dependencies } = fixture();
    const scenarioId = new mongoose.Types.ObjectId();
    await IssueScenario.create({ issue: issueId, createdBy: userId, name: "Scenario", targetModel: new mongoose.Types.ObjectId(), config: { parameterOverrides: {} }, phaseResults: [{ phase: 0, source: { stageResult: null, domainType: "numeric" }, requestSnapshot: {}, result: { standardResult: {}, modelExecution: {}, rawOutput: {} }, execution: { attemptId: new mongoose.Types.ObjectId(), startedAt: new Date(), completedAt: new Date() } }] });
    const requestAnalysis = vi.fn(async () => ({ facts: {}, interpretation: "General", visualizations: [] }));
    const requestModelAnalysis = vi.fn(async ({ apiModelKey, analysisContext }) => ({ facts: { executionKey: analysisContext.projectedFor }, interpretation: apiModelKey, visualizations: [] }));
    const common = { issueId, userId, ...dependencies, requestAnalysis, requestModelAnalysis };

    const entries = await reloadFinishedIssueExecutionAnalyses({ executionKeys: ["base", String(scenarioId)], ...common });
    const byKey = Object.fromEntries(entries.map((entry) => [entry.executionKey, entry]));

    expect(byKey.base.stageAnalyses.alternativeEvaluation).toMatchObject({ apiModelKey: "base-model", analysis: { facts: { executionKey: "base" }, interpretation: "base-model" } });
    expect(byKey[String(scenarioId)].stageAnalyses.alternativeEvaluation).toMatchObject({ apiModelKey: "scenario-model", analysis: { facts: { executionKey: String(scenarioId) }, interpretation: "scenario-model" } });
    const persisted = await IssueResultsAnalysis.find({ issue: issueId }).lean();
    expect(Object.fromEntries(persisted.map((entry) => [entry.executionKey, entry.stageAnalyses]))).toMatchObject({
      base: { alternativeEvaluation: { apiModelKey: "base-model", analysis: { facts: { executionKey: "base" } } } },
      [String(scenarioId)]: { alternativeEvaluation: { apiModelKey: "scenario-model", analysis: { facts: { executionKey: String(scenarioId) } } } },
    });
  });

  it("rejects projected executions with conflicting successful model identities", async () => {
    const { issueId, userId, dependencies } = fixture();
    dependencies.executionProjector.mockReturnValue({ execution: { key: "base" }, analysisContext: { rounds: [
      { executionAttempts: [{ status: "succeeded" }], selectedExecution: { modelContext: { apiModelKey: "first-model" } } },
      { executionAttempts: [{ status: "succeeded" }], selectedExecution: { modelContext: { apiModelKey: "second-model" } } },
    ] } });
    const common = { issueId, userId, requestAnalysis: vi.fn(async () => ({ facts: {}, interpretation: "General", visualizations: [] })), ...dependencies };

    await expect(getOrGenerateFinishedIssueExecutionAnalysis({ executionKey: "base", ...common })).rejects.toThrow(/exactly one apiModelKey/);
    expect(dependencies.requestModelAnalysis).not.toHaveBeenCalled();
    expect(await IssueResultsAnalysis.countDocuments({ issue: issueId })).toBe(0);
  });

  it("preserves a persisted analysis when forced model analysis reload fails", async () => {
    const { issueId, userId, dependencies } = fixture();
    const firstGeneratedAt = new Date("2026-01-01T00:00:00.000Z");
    const initial = await getOrGenerateFinishedIssueExecutionAnalysis({
      issueId,
      userId,
      executionKey: "base",
      ...dependencies,
      requestAnalysis: vi.fn(async () => ({ facts: {}, interpretation: "Initial general", visualizations: [] })),
      requestModelAnalysis: vi.fn(async () => ({ facts: {}, interpretation: "Initial model", visualizations: [] })),
      now: () => firstGeneratedAt,
    });

    await expect(getOrGenerateFinishedIssueExecutionAnalysis({
      issueId,
      userId,
      executionKey: "base",
      force: true,
      ...dependencies,
      requestAnalysis: vi.fn(async () => ({ facts: {}, interpretation: "Replacement general", visualizations: [] })),
      requestModelAnalysis: vi.fn(async () => { throw new Error("model analysis failed"); }),
      now: () => new Date("2026-01-02T00:00:00.000Z"),
    })).rejects.toThrow("model analysis failed");

    const persisted = await IssueResultsAnalysis.findOne({ issue: issueId, executionKey: "base" }).lean();
    expect(persisted.genericAnalysis).toEqual(initial.genericAnalysis);
    expect(persisted.stageAnalyses).toEqual(initial.stageAnalyses);
    expect(persisted.generatedAt).toEqual(firstGeneratedAt);
  });

  it("serializes legacy records without inventing stage analyses", async () => {
    const { issueId, userId, dependencies } = fixture();
    const generatedAt = new Date("2026-01-01T00:00:00.000Z");
    await IssueResultsAnalysis.create({ issue: issueId, executionKey: "base", executionType: "base", genericAnalysis: { facts: {}, interpretation: "Legacy", visualizations: [] }, generatedAt });

    const result = await getOrGenerateFinishedIssueExecutionAnalysis({ issueId, userId, executionKey: "base", requestAnalysis: vi.fn(), ...dependencies });

    expect(result).toEqual({ executionKey: "base", executionType: "base", scenarioId: null, genericAnalysis: { facts: {}, interpretation: "Legacy", visualizations: [] }, generatedAt: generatedAt.toISOString() });
    expect(result).not.toHaveProperty("stageAnalyses");
  });

  it("rejects empty, oversized, and unavailable reload selections", async () => {
    const { issueId, userId, dependencies } = fixture();
    const common = { issueId, userId, requestAnalysis: vi.fn(), ...dependencies };

    await expect(reloadFinishedIssueExecutionAnalyses({ executionKeys: [], ...common })).rejects.toThrow(/between 1 and 3/);
    await expect(reloadFinishedIssueExecutionAnalyses({ executionKeys: ["base", "a", "b", "c"], ...common })).rejects.toThrow(/between 1 and 3/);
    await expect(reloadFinishedIssueExecutionAnalyses({ executionKeys: [String(new mongoose.Types.ObjectId())], ...common })).rejects.toThrow(/not available/);
  });
});
