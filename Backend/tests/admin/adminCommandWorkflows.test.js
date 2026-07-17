import { describe, expect, it, vi } from "vitest";

import {
  computeAdminIssueWeights,
  editAdminIssueExperts,
  removeAdminIssue,
  resolveAdminIssue,
} from "../../modules/admin/issueCommands/index.js";
import { deleteAdminUserWorkflow } from "../../modules/admin/users/index.js";

describe("admin command workflows", () => {
  it("loads the owner before editing experts inside a transaction", async () => {
    const events = [];
    const session = { id: "session" };
    const loadExecutionContext = vi.fn(async (options) => {
      events.push("context");
      expect(options).toEqual({ issueId: "issue-id" });
      return { ownerUserId: "owner-id" };
    });
    const editExperts = vi.fn(async (options) => {
      events.push("edit");
      expect(options).toEqual({
        issueId: "issue-id",
        userId: "owner-id",
        expertsToAdd: ["new@example.com"],
        expertsToRemove: ["old@example.com"],
        expertWeightsByEmail: null,
        hasExpertWeightsByEmail: true,
        session,
      });
      return { issueName: "Issue name" };
    });
    const runTransaction = vi.fn(async (operation) => {
      events.push("transaction");
      return operation(session);
    });

    await expect(
      editAdminIssueExperts(
        {
          issueId: "issue-id",
          payload: {
            expertsToAdd: ["new@example.com"],
            expertsToRemove: ["old@example.com"],
            expertWeightsByEmail: null,
          },
        },
        { loadExecutionContext, editExperts, runTransaction }
      )
    ).resolves.toEqual({
      message: "Experts updated successfully",
      data: { issueName: "Issue name" },
    });
    expect(events).toEqual(["context", "transaction", "edit"]);
  });

  it("computes criteria weights through canonical client defaults and preserves fallbacks", async () => {
    const computeEvaluationStage = vi.fn(async () => ({
      message: "Weights computed",
      currentStage: "alternativeEvaluation",
      consensusPhase: 2,
      result: null,
    }));

    await expect(
      computeAdminIssueWeights(
        { issueId: "issue-id" },
        {
          loadExecutionContext: async () => ({ ownerUserId: "owner-id" }),
          computeEvaluationStage,
        }
      )
    ).resolves.toEqual({
      message: "Weights computed",
      data: {
        currentStage: "alternativeEvaluation",
        consensusPhase: 2,
        weightsByCriterion: {},
        collectiveEvaluations: {},
        consensusMeasure: null,
        consensusLifecycle: null,
        modelExecution: null,
        rawOutput: {},
      },
    });
    expect(computeEvaluationStage).toHaveBeenCalledWith({
      issueId: "issue-id",
      userId: "owner-id",
      stage: "criteriaWeighting",
    });
  });

  it("resolves alternatives and keeps every computation output field", async () => {
    const resultPayload = {
      rankedAlternatives: [{ name: "A" }],
      collectiveEvaluations: { c1: 4 },
      plotsGraphic: { ranking: "plot" },
      consensusMeasure: 0.91,
      consensusLifecycle: { phase: 2 },
      modelExecution: { key: "model" },
      rawOutput: { raw: true },
    };
    const computeEvaluationStage = vi.fn(async () => ({
      message: "Issue resolved",
      currentStage: "finished",
      consensusPhase: 2,
      result: resultPayload,
    }));

    await expect(
      resolveAdminIssue(
        { issueId: "issue-id" },
        {
          loadExecutionContext: async () => ({ ownerUserId: "owner-id" }),
          computeEvaluationStage,
        }
      )
    ).resolves.toEqual({
      message: "Issue resolved",
      data: {
        finished: true,
        currentStage: "finished",
        consensusPhase: 2,
        ...resultPayload,
      },
    });
    expect(computeEvaluationStage).toHaveBeenCalledWith({
      issueId: "issue-id",
      userId: "owner-id",
      stage: "alternativeEvaluation",
    });
  });

  it("loads and deletes an issue within the same transaction", async () => {
    const session = { id: "session" };
    const issue = { _id: "issue-object-id", name: "Issue name" };
    const loadExecutionContext = vi.fn(async () => ({ issue }));
    const deleteIssue = vi.fn(async () => {});
    const runTransaction = vi.fn(async (operation) => operation(session));

    await expect(
      removeAdminIssue(
        { issueId: "issue-id" },
        { loadExecutionContext, deleteIssue, runTransaction }
      )
    ).resolves.toEqual({
      message: "Issue Issue name removed",
      data: { issueName: "Issue name" },
    });
    expect(loadExecutionContext).toHaveBeenCalledWith({
      issueId: "issue-id",
      session,
    });
    expect(deleteIssue).toHaveBeenCalledWith({
      issueId: "issue-object-id",
      session,
    });
  });

  it("validates and deletes an admin user inside one transaction", async () => {
    const session = { id: "session" };
    const summary = { domainsDeleted: 1 };
    const deleteUser = vi.fn(async () => ({
      deletedUser: { id: "user-id", email: "user@example.com" },
      summary,
    }));
    const runTransaction = vi.fn(async (operation) => operation(session));

    await expect(
      deleteAdminUserWorkflow(
        { targetUserId: "user-id", adminUserId: "admin-id" },
        {
          deleteUser,
          isValidUserId: () => true,
          runTransaction,
        }
      )
    ).resolves.toEqual({
      message: "User user@example.com deleted successfully",
      data: {
        deletedUser: { id: "user-id", email: "user@example.com" },
        summary,
      },
    });
    expect(deleteUser).toHaveBeenCalledWith({
      targetUserId: "user-id",
      adminUserId: "admin-id",
      session,
    });
  });

  it("rejects an invalid admin user id before opening a transaction", async () => {
    const runTransaction = vi.fn();

    await expect(
      deleteAdminUserWorkflow(
        { targetUserId: "not-an-id", adminUserId: "admin-id" },
        { isValidUserId: () => false, runTransaction }
      )
    ).rejects.toMatchObject({
      message: "Valid user id is required",
      statusCode: 400,
      field: "id",
    });
    expect(runTransaction).not.toHaveBeenCalled();
  });
});
