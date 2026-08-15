import { describe, expect, it } from "vitest";
import { IssueExecutionAttempt } from "../../../models/IssueExecutionAttempts.js";
import { executeTrackedDecisionModelRequest, markExecutionApplied } from "../../../modules/issues/modelExecution/executionEvidence.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const input = () => ({ issue: null, scope: "issueCreation", actorType: "system", actorUser: null, correlationId: "attempt-test", evaluationStage: "criteriaWeighting", issueStage: null, consensusPhase: null, modelContext: { modelId: null, modelName: null, apiModelKey: "test", apiEndpointPath: "/run", evaluationStructureKey: "test", serviceBaseUrl: "http://dms", modelKind: "test" } });
const invoke = (overrides = {}) => executeTrackedDecisionModelRequest({ attemptInput: input(), apiEndpointPath: "/run", requestPayload: { value: 1 }, errorMessage: "failed", decisionModelsServiceBaseUrl: "http://dms", httpClient: { post: async () => ({ status: 200, headers: { authorization: "secret", "x-test": "yes" }, data: { success: true, data: { accepted: true } } }) }, normalize: async (result) => result, ...overrides });

describe("IssueExecutionAttempt evidence", () => {
  it("preserves exact request, raw/unwrapped response, normalized result and timings", async () => {
    const { attempt } = await invoke();
    const stored = await IssueExecutionAttempt.findById(attempt._id).lean();
    expect(stored).toMatchObject({ status: "succeeded", request: { body: { value: 1 }, resolvedUrl: "http://dms/run" }, response: { rawBody: { success: true, data: { accepted: true } }, unwrappedBody: { accepted: true }, headers: { "x-test": "yes" } }, normalizedResult: { accepted: true } });
    expect(stored.startedAt).toBeInstanceOf(Date); expect(stored.responseReceivedAt).toBeInstanceOf(Date); expect(stored.completedAt).toBeInstanceOf(Date); expect(stored.durationMs).toBeGreaterThanOrEqual(0); expect(stored.transportDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("records normalization failures as failed and notApplicable", async () => {
    await expect(invoke({ normalize: async () => { throw new Error("invalid model result"); } })).rejects.toThrow("invalid model result");
    const stored = await IssueExecutionAttempt.findOne({ correlationId: "attempt-test", status: "failed" }).sort({ createdAt: -1 }).lean();
    expect(stored).toMatchObject({ failureStage: "normalization", application: { status: "notApplicable" }, normalizedResult: null });
  });

  it("does not rewrite terminal application evidence", async () => {
    const { attempt } = await invoke();
    const applied = await markExecutionApplied({ attemptId: attempt._id, entityType: "stageResult", entityId: attempt._id, resultSnapshot: { result: 1 } });
    const repeated = await markExecutionApplied({ attemptId: attempt._id, entityType: "stageResult", entityId: attempt._id, resultSnapshot: { result: 2 } });
    expect(applied.application.status).toBe("applied"); expect(repeated).toBeNull();
    expect((await IssueExecutionAttempt.findById(attempt._id).lean()).application.resultSnapshot).toEqual({ result: 1 });
  });
});
