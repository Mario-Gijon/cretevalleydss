import { describe, expect, it, vi } from "vitest";

import {
  buildStoredCreateIssueData,
  CREATE_ISSUE_DRAFT_VERSION,
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
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("degrades safely when localStorage operations throw", () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage unavailable");
      });
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage unavailable");
      });

    expect(() => readStoredCreateIssueData("unavailable-draft")).not.toThrow();
    expect(() =>
      persistStoredCreateIssueData("unavailable-draft", {})
    ).not.toThrow();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it("persists and restores the stored create-issue draft fields", () => {
    const storageKey = "create-issue-draft-roundtrip";
    const criteriaWeightingConfig = {
      mode: "creatorApiModel",
      payload: { bestCriterionId: "" },
      initializationIdentity:
        '["bwm-model","bestWorstCriteria",["criterion-1"]]',
    };
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
      criteriaWeightingConfig,
      closureDate: new Date("2026-07-15T00:00:00.000Z"),
      consensusMaxPhases: 4,
      consensusThreshold: 0.85,
      simulateConsensus: true,
    });

    persistStoredCreateIssueData(storageKey, storedData);

    expect(readStoredCreateIssueData(storageKey)).toEqual({
      draftVersion: CREATE_ISSUE_DRAFT_VERSION,
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
      criteriaWeightingConfig,
      closureDate: "2026-07-15T00:00:00.000Z",
      consensusMaxPhases: 4,
      consensusThreshold: 0.85,
      simulateConsensus: true,
    });
  });

  it.each([
    ["legacy", { issueName: "Old draft" }],
    ["unsupported", { draftVersion: CREATE_ISSUE_DRAFT_VERSION + 1 }],
  ])("discards %s drafts and removes them from storage", (_label, draft) => {
    const storageKey = `incompatible-${_label}-draft`;
    localStorage.setItem(storageKey, JSON.stringify(draft));

    expect(readStoredCreateIssueData(storageKey)).toEqual({});
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("discards current-version drafts with an invalid selected model", () => {
    const storageKey = "invalid-current-create-issue-draft";
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        draftVersion: CREATE_ISSUE_DRAFT_VERSION,
        selectedModel: { name: "Missing stable identity" },
      })
    );

    expect(readStoredCreateIssueData(storageKey)).toEqual({});
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("resolves stable defaults when stored consensus values are missing or invalid", () => {
    expect(resolveInitialConsensusMaxPhases({})).toBe(3);
    expect(resolveInitialConsensusMaxPhases({ consensusMaxPhases: "" })).toBe(3);
    expect(resolveInitialConsensusMaxPhases({ consensusMaxPhases: 0 })).toBe(3);
    expect(resolveInitialConsensusMaxPhases({ consensusMaxPhases: "7" })).toBe(7);
    expect(resolveInitialConsensusMaxPhases({ consensusMaxPhases: null })).toBeNull();

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
