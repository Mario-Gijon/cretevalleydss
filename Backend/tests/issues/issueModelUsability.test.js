import { describe, expect, it } from "vitest";

import {
  assertIssueModelExecutionAllowedOrThrow,
  assertIssueModelExecutionAuthorizedOrThrow,
  isIssueModelExecutionAllowed,
} from "../../modules/issues/issueModelUsability.js";
import { buildResultStructureRegistry } from "../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";

const rankingModel = (overrides = {}) => ({
  modelKind: "issue",
  implementationStatus: "ready",
  publicUsable: true,
  issueExecutionAuthorized: true,
  manifestSync: { isStale: false },
  resultStructureKey: "ranking",
  resultStructureVersion: 1,
  ...overrides,
});

const sortingRegistry = (issueExecution) =>
  buildResultStructureRegistry([
    {
      key: "sorting",
      version: 1,
      capabilities: { issueExecution },
      validateAndNormalize: ({ result }) => result,
    },
  ]);

describe("per-model issue execution authorization", () => {
  it("keeps an explicitly authorized ranking Decision Plugin executable", () => {
    expect(isIssueModelExecutionAllowed(rankingModel())).toBe(true);
    expect(assertIssueModelExecutionAuthorizedOrThrow(rankingModel())).toEqual(
      rankingModel()
    );
  });

  it("keeps execution permission separate from administrative creation visibility", () => {
    expect(isIssueModelExecutionAllowed(rankingModel({
      visibleInIssueCreation: false,
    }))).toBe(true);
  });

  it("denies a ready model when per-model authorization is absent", () => {
    const model = rankingModel({ issueExecutionAuthorized: undefined });

    expect(isIssueModelExecutionAllowed(model)).toBe(false);
    expect(() => assertIssueModelExecutionAuthorizedOrThrow(model)).toThrow(
      expect.objectContaining({
        code: "ISSUE_MODEL_EXECUTION_NOT_AUTHORIZED",
      })
    );
  });

  it.each([
    ["scaffold", { implementationStatus: "scaffold" }],
    ["stale", { manifestSync: { isStale: true } }],
    ["not public", { publicUsable: false }],
  ])("still denies an authorized model that is %s", (_label, overrides) => {
    const model = rankingModel(overrides);

    expect(isIssueModelExecutionAllowed(model)).toBe(false);
    expect(() => assertIssueModelExecutionAuthorizedOrThrow(model)).toThrow(
      "not ready for issue execution"
    );
  });

  it("denies a synthetic sorting model without individual authorization", () => {
    const model = rankingModel({
      apiModelKey: "synthetic-sorting-plugin",
      issueExecutionAuthorized: false,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
    });
    const registry = sortingRegistry(true);

    expect(isIssueModelExecutionAllowed(model, { resultStructureRegistry: registry })).toBe(false);
    expect(() => assertIssueModelExecutionAuthorizedOrThrow(model, {
      resultStructureRegistry: registry,
    })).toThrow(
      expect.objectContaining({
        code: "ISSUE_MODEL_EXECUTION_NOT_AUTHORIZED",
      })
    );
  });

  it("requires the Result Structure to permit execution even when the model is authorized", () => {
    const model = rankingModel({
      apiModelKey: "synthetic-sorting-plugin",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
    });
    const registry = sortingRegistry(false);

    expect(isIssueModelExecutionAllowed(model, { resultStructureRegistry: registry })).toBe(false);
    expect(() => assertIssueModelExecutionAllowedOrThrow(model, {
      resultStructureRegistry: registry,
    })).toThrow("not enabled for model execution");
  });

  it("allows a synthetic sorting model when both independent permissions are true", () => {
    const model = rankingModel({
      apiModelKey: "synthetic-sorting-plugin",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
    });

    expect(isIssueModelExecutionAllowed(model, {
      resultStructureRegistry: sortingRegistry(true),
    })).toBe(true);
    expect(assertIssueModelExecutionAllowedOrThrow(model, {
      resultStructureRegistry: sortingRegistry(true),
    })).toEqual(model);
  });

  it("does not apply Issue execution permission to Criteria Weighting plugins", () => {
    const model = rankingModel({
      modelKind: "criteriaWeighting",
      issueExecutionAuthorized: true,
    });

    expect(isIssueModelExecutionAllowed(model)).toBe(false);
  });
});
