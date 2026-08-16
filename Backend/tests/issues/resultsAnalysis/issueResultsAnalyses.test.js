import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { IssueResultsAnalysis } from "../../../models/IssueResultsAnalyses.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

describe("IssueResultsAnalysis", () => {
  it("keeps one canonical analysis per Issue and execution key and replaces its payload", async () => {
    await IssueResultsAnalysis.syncIndexes();
    const issue = new mongoose.Types.ObjectId();
    const generatedAt = new Date("2026-01-01T00:00:00.000Z");
    await IssueResultsAnalysis.create({ issue, executionKey: "base", executionType: "base", scenario: null, genericAnalysis: { facts: { phaseCount: 1 }, interpretation: "first", visualizations: [] }, generatedAt });

    await expect(IssueResultsAnalysis.create({ issue, executionKey: "base", executionType: "base", genericAnalysis: { facts: {}, interpretation: "duplicate", visualizations: [] }, generatedAt })).rejects.toThrow();

    const replacedAt = new Date("2026-01-02T00:00:00.000Z");
    await IssueResultsAnalysis.findOneAndUpdate(
      { issue, executionKey: "base" },
      { $set: { genericAnalysis: { facts: { phaseCount: 2 }, interpretation: "replaced", visualizations: [] }, generatedAt: replacedAt } },
      { new: true }
    );
    const entries = await IssueResultsAnalysis.find({ issue }).lean();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ executionKey: "base", executionType: "base", genericAnalysis: { interpretation: "replaced" }, generatedAt: replacedAt });
  });

  it("stores Scenario analyses under their canonical Scenario id", async () => {
    const issue = new mongoose.Types.ObjectId();
    const scenario = new mongoose.Types.ObjectId();
    const entry = await IssueResultsAnalysis.create({ issue, executionKey: String(scenario), executionType: "scenario", scenario, genericAnalysis: { facts: {}, interpretation: "Scenario", visualizations: [] }, generatedAt: new Date() });

    expect(String(entry.scenario)).toBe(String(scenario));
    expect(entry.executionKey).toBe(String(scenario));
  });
});
