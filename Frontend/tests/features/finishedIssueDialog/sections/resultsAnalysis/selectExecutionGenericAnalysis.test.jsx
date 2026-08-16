import { describe, expect, it } from "vitest";

import { selectExecutionGenericAnalysis } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/selectExecutionGenericAnalysis.js";

describe("selectExecutionGenericAnalysis", () => {
  it("resolves persisted Base and Scenario analyses by execution key", () => {
    const payload = {
      resultsAnalysis: {
        executions: [
          { executionKey: "base", executionType: "base", scenarioId: null, genericAnalysis: { interpretation: "Base" } },
          { executionKey: "scenario-1", executionType: "scenario", scenarioId: "scenario-1", genericAnalysis: { interpretation: "Scenario" } },
        ],
      },
    };

    expect(selectExecutionGenericAnalysis(payload, "base")).toEqual({ interpretation: "Base" });
    expect(selectExecutionGenericAnalysis(payload, "scenario-1")).toEqual({ interpretation: "Scenario" });
    expect(selectExecutionGenericAnalysis(payload, "missing")).toBeNull();
  });
});
