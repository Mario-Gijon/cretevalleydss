import { describe, expect, it } from "vitest";

import { selectExecutionGenericAnalysis } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/selectExecutionGenericAnalysis.js";
import { selectExecutionAlternativeEvaluationAnalysis } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/selectExecutionAlternativeEvaluationAnalysis.js";

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

  it("resolves optional alternative evaluation analysis by its own execution key", () => {
    const payload = { resultsAnalysis: { executions: [
      { executionKey: "base", stageAnalyses: { alternativeEvaluation: { apiModelKey: "base-model", analysis: { interpretation: "Base model" } } } },
      { executionKey: "scenario-1", stageAnalyses: { alternativeEvaluation: { apiModelKey: "scenario-model", analysis: { interpretation: "Scenario model" } } } },
    ] } };
    expect(selectExecutionAlternativeEvaluationAnalysis(payload, "base")).toEqual({ apiModelKey: "base-model", analysis: { interpretation: "Base model" } });
    expect(selectExecutionAlternativeEvaluationAnalysis(payload, "scenario-1")).toEqual({ apiModelKey: "scenario-model", analysis: { interpretation: "Scenario model" } });
    expect(selectExecutionAlternativeEvaluationAnalysis(payload, "missing")).toBeNull();
  });
});
