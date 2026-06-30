import { describe, expect, it } from "vitest";

import {
  buildStoredCreateIssueData,
  persistStoredCreateIssueData,
  readStoredCreateIssueData,
  resolveInitialConsensusMaxPhases,
  resolveInitialConsensusThreshold,
  resolveInitialCriteriaWeightingConfig,
  resolveInitialExpressionDomainConfig,
} from "../../../src/features/createIssue/logic/createIssueDraftState.js";

describe("createIssueDraftState", () => {
  it("returns safe defaults when the draft is missing", () => {
    expect(readStoredCreateIssueData("missing-create-issue-draft")).toEqual({});
  });

  it("returns safe defaults when stored JSON is malformed", () => {
    const storageKey = "invalid-create-issue-draft";
    localStorage.setItem(storageKey, "{bad-json");

    expect(readStoredCreateIssueData(storageKey)).toEqual({});
  });

  it("persists and restores the stored create-issue draft fields", () => {
    const storageKey = "create-issue-draft-roundtrip";
    const storedData = buildStoredCreateIssueData({
      activeStep: 5,
      completed: { 0: true, 1: true },
      selectedModel: { _id: "model-1", name: "AHP" },
      showConsensusModels: true,
      effectiveIsConsensus: true,
      alternatives: ["A", "B"],
      criteria: [{ id: "criterion-1", name: "Cost", children: [] }],
      addedExperts: ["expert@example.com"],
      expertWeights: { "expert@example.com": 1 },
      expertWeightsCustomized: true,
      issueName: "Budget planning",
      issueDescription: "Detailed issue summary",
      expressionDomainConfig: { mode: "global", globalDomainId: "domain-1" },
      paramValues: { threshold: 0.7 },
      criteriaWeightingConfig: { mode: "expertManual", payload: {} },
      closureDate: new Date("2026-07-15T00:00:00.000Z"),
      consensusMaxPhases: 4,
      consensusThreshold: 0.85,
      simulateConsensus: true,
    });

    persistStoredCreateIssueData(storageKey, storedData);

    expect(readStoredCreateIssueData(storageKey)).toEqual({
      activeStep: 5,
      completed: { 0: true, 1: true },
      selectedModel: { _id: "model-1", name: "AHP" },
      showConsensusModels: true,
      isConsensus: true,
      alternatives: ["A", "B"],
      criteria: [{ id: "criterion-1", name: "Cost", children: [] }],
      addedExperts: ["expert@example.com"],
      expertWeights: { "expert@example.com": 1 },
      expertWeightsCustomized: true,
      issueName: "Budget planning",
      issueDescription: "Detailed issue summary",
      expressionDomainConfig: { mode: "global", globalDomainId: "domain-1" },
      paramValues: { threshold: 0.7 },
      criteriaWeightingConfig: { mode: "expertManual", payload: {} },
      closureDate: "2026-07-15T00:00:00.000Z",
      consensusMaxPhases: 4,
      consensusThreshold: 0.85,
      simulateConsensus: true,
    });
  });

  it("resolves stable defaults when stored consensus values are missing or invalid", () => {
    expect(resolveInitialConsensusMaxPhases({})).toBe(3);
    expect(resolveInitialConsensusMaxPhases({ consensusMaxPhases: "" })).toBe(3);
    expect(resolveInitialConsensusMaxPhases({ consensusMaxPhases: 0 })).toBe(3);
    expect(resolveInitialConsensusMaxPhases({ consensusMaxPhases: "7" })).toBe(7);

    expect(resolveInitialConsensusThreshold({})).toBe(0.7);
    expect(resolveInitialConsensusThreshold({ consensusThreshold: "bad" })).toBe(0.7);
    expect(resolveInitialConsensusThreshold({ consensusThreshold: "0.9" })).toBe(0.9);
  });

  it("resolves safe defaults for missing or invalid helper values", () => {
    expect(resolveInitialExpressionDomainConfig({})).toEqual({
      mode: "global",
      globalDomainId: "",
    });
    expect(resolveInitialExpressionDomainConfig({ expressionDomainConfig: [] })).toEqual({
      mode: "global",
      globalDomainId: "",
    });

    expect(
      resolveInitialCriteriaWeightingConfig({
        storedData: {},
        fallbackConfig: { mode: "expertManual", payload: {} },
      })
    ).toEqual({ mode: "expertManual", payload: {} });
    expect(
      resolveInitialCriteriaWeightingConfig({
        storedData: { criteriaWeightingConfig: [] },
        fallbackConfig: { mode: "expertManual", payload: {} },
      })
    ).toEqual({ mode: "expertManual", payload: {} });
  });
});
