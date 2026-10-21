import { afterEach, describe, expect, it } from "vitest";
import { isIssueModelResultStructureCapabilityEnabled, isTopsisSort2016E2eActivationEnabled } from "../../modules/issues/e2eIssueExecutionOverride.js";
import { isIssueModelExecutionAllowed } from "../../modules/issues/issueModelUsability.js";
import { isResultStructureCapabilityEnabled } from "../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";

const originalEnvironment = { ...process.env };

afterEach(() => {
  for (const key of [
    "NODE_ENV",
    "E2E_ISOLATED_STACK",
    "E2E_ENABLE_TOPSIS_SORT_2016",
    "MONGODB_URI",
    "URI_MONGODB",
    "MONGODB_DB_NAME",
  ]) {
    if (Object.hasOwn(originalEnvironment, key)) process.env[key] = originalEnvironment[key];
    else delete process.env[key];
  }
});

const topsisModel = {
  modelKind: "issue",
  apiModelKey: "topsis_sort_2016",
  implementationStatus: "ready",
  publicUsable: true,
  manifestSync: { isStale: false },
  issueExecutionAuthorized: true,
  resultStructureKey: "sorting",
  resultStructureVersion: 1,
};

const enableIsolatedE2e = () => {
  process.env.NODE_ENV = "e2e";
  process.env.E2E_ISOLATED_STACK = "true";
  process.env.E2E_ENABLE_TOPSIS_SORT_2016 = "true";
  process.env.MONGODB_URI = "mongodb://mongo-e2e:27017/?replicaSet=rs0";
  process.env.MONGODB_DB_NAME = "cretevalley_e2e";
};

describe("isolated TOPSIS-Sort 2016 E2E execution override", () => {
  it("keeps the Result Plugin disabled in the default registry", () => {
    expect(isResultStructureCapabilityEnabled({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      capability: "issueExecution",
    })).toBe(false);
  });

  it("allows only the authorized TOPSIS-Sort model inside the isolated E2E database", () => {
    enableIsolatedE2e();

    expect(isTopsisSort2016E2eActivationEnabled()).toBe(true);
    expect(isIssueModelExecutionAllowed(topsisModel)).toBe(true);
    expect(isIssueModelResultStructureCapabilityEnabled({
      model: topsisModel,
      resultStructureMetadata: { resultStructureKey: "sorting", resultStructureVersion: 1 },
      capability: "consensus",
    })).toBe(false);
    expect(isIssueModelResultStructureCapabilityEnabled({
      model: topsisModel,
      resultStructureMetadata: { resultStructureKey: "sorting", resultStructureVersion: 1 },
      capability: "resultsAnalysis",
    })).toBe(false);
  });

  it.each([
    ["NODE_ENV", "development"],
    ["E2E_ISOLATED_STACK", "false"],
    ["MONGODB_DB_NAME", "cretevalley_dev"],
    ["MONGODB_URI", "mongodb://mongo-dev:27017/dev"],
  ])("fails closed when %s does not identify the isolated stack", (key, value) => {
    enableIsolatedE2e();
    process.env[key] = value;

    expect(isTopsisSort2016E2eActivationEnabled()).toBe(false);
    expect(isIssueModelExecutionAllowed(topsisModel)).toBe(false);
  });

  it("does not extend the override to another model or sorting version", () => {
    enableIsolatedE2e();
    const otherModel = { ...topsisModel, apiModelKey: "ahp_sort" };
    const otherVersion = { ...topsisModel, resultStructureVersion: 2 };

    expect(isIssueModelExecutionAllowed(otherModel)).toBe(false);
    expect(isIssueModelExecutionAllowed(otherVersion)).toBe(false);
  });

  it("still requires ordinary model authorization and readiness", () => {
    enableIsolatedE2e();
    expect(isIssueModelExecutionAllowed({ ...topsisModel, issueExecutionAuthorized: false })).toBe(false);
    expect(isIssueModelExecutionAllowed({ ...topsisModel, publicUsable: false })).toBe(false);
    expect(isIssueModelExecutionAllowed({ ...topsisModel, implementationStatus: "scaffold" })).toBe(false);
    expect(isIssueModelExecutionAllowed({ ...topsisModel, manifestSync: { isStale: true } })).toBe(false);
  });
});
