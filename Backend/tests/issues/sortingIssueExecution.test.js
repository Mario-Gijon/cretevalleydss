import { describe, expect, it } from "vitest";

import { isResultStructureCapabilityEnabled } from "../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";
import { isIssueModelExecutionAllowed } from "../../modules/issues/issueModelUsability.js";

const issueModel = (overrides = {}) => ({
  modelKind: "issue",
  apiModelKey: "topsis_sort_2016",
  implementationStatus: "ready",
  publicUsable: true,
  manifestSync: { isStale: false },
  issueExecutionAuthorized: true,
  resultStructureKey: "sorting",
  resultStructureVersion: 1,
  ...overrides,
});

describe("normal sorting issue execution authorization", () => {
  it("enables sorting@1 issue execution while keeping consensus and analysis disabled", () => {
    expect(isResultStructureCapabilityEnabled({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      capability: "issueExecution",
    })).toBe(true);
    expect(isResultStructureCapabilityEnabled({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      capability: "consensus",
    })).toBe(false);
    expect(isResultStructureCapabilityEnabled({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      capability: "resultsAnalysis",
    })).toBe(false);
  });

  it("allows TOPSIS-Sort and denies another sorting model without individual authorization", () => {
    expect(isIssueModelExecutionAllowed(issueModel())).toBe(true);
    expect(isIssueModelExecutionAllowed(issueModel({
      apiModelKey: "another-sorting-plugin",
      issueExecutionAuthorized: false,
    }))).toBe(false);
  });

  it.each([
    ["stale", { manifestSync: { isStale: true } }],
    ["not ready", { implementationStatus: "scaffold" }],
    ["not public", { publicUsable: false }],
  ])("keeps an authorized sorting model unavailable when %s", (_label, overrides) => {
    expect(isIssueModelExecutionAllowed(issueModel(overrides))).toBe(false);
  });

  it("keeps execution authorization independent from Admin creation visibility", () => {
    expect(isIssueModelExecutionAllowed(issueModel({
      visibleInIssueCreation: false,
    }))).toBe(true);
  });
});
