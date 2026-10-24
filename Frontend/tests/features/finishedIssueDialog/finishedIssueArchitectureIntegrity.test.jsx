import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/issue.service", () => ({ getFinishedIssueInfo: vi.fn() }));

import { getFinishedIssueInfo } from "../../../src/services/issue.service";
import { useFinishedIssueData } from "../../../src/features/finishedIssueDialog/hooks/useFinishedIssueData.js";
import { resolveEvaluationsWorkspaceSelection } from "../../../src/features/finishedIssueDialog/sections/evaluations/logic/buildEvaluationsWorkspaceData.js";
import { buildModelsParameterContextData } from "../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsData.js";
import { selectFinishedIssueExecution } from "../../../src/features/finishedIssueDialog/logic/selectFinishedIssueExecution.js";
import { buildFinishedIssuePayloadFixture } from "../../mocks/fixtures/finishedIssueDialog.fixtures.js";

describe("Finished Issue architecture integrity", () => {
  const buildTopsisSortPendingCollectivePayload = () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.lifecycle.active = false;
    payload.lifecycle.currentStage = "finished";
    payload.lifecycle.finishedAt = new Date().toISOString();
    payload.models.base.technical = { apiModelKey: "topsis_sort_2016" };
    payload.resultsAnalysis = { executions: [] };
    const collective = payload.evaluations.collective.find(
      (entry) => entry.stage === "alternativeEvaluation",
    );
    collective.rawPayload = null;
    collective.displayPayload = null;
    return payload;
  };

  it("rejects retired response-shape wrappers and accepts only the definitive contract", async () => {
    const canonical = buildFinishedIssuePayloadFixture();
    getFinishedIssueInfo.mockResolvedValueOnce({ data: { payload: canonical } });
    const { result } = renderHook(() => useFinishedIssueData({ selectedIssue: { id: "issue-1" }, open: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.payload).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.collectiveResolutionStatus).toBe("error");

    getFinishedIssueInfo.mockResolvedValueOnce({ data: { issueInfo: canonical } });
    await act(async () => { await result.current.refreshPayload(); });
    expect(result.current.payload).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);

    getFinishedIssueInfo.mockResolvedValueOnce({ data: canonical });
    await act(async () => { await result.current.refreshPayload(); });
    expect(result.current.payload).toEqual(canonical);
  });

  it("resets payload and errors on close and stores rejected requests as errors", async () => {
    const canonical = buildFinishedIssuePayloadFixture();
    getFinishedIssueInfo.mockResolvedValueOnce({ data: canonical });
    const { result, rerender } = renderHook(({ open }) => useFinishedIssueData({ selectedIssue: { id: "issue-1" }, open }), { initialProps: { open: true } });
    await waitFor(() => expect(result.current.payload).toEqual(canonical));
    rerender({ open: false });
    expect(result.current.payload).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("stores rejected requests without leaving a payload", async () => {
    getFinishedIssueInfo.mockRejectedValueOnce(new Error("network failure"));
    const { result } = renderHook(() => useFinishedIssueData({ selectedIssue: { id: "issue-1" }, open: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.payload).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("rechecks once when TOPSIS-Sort analysis is still being persisted and resolves the collective", async () => {
    const pending = buildTopsisSortPendingCollectivePayload();
    const available = structuredClone(pending);
    const collective = available.evaluations.collective.find(
      (entry) => entry.stage === "alternativeEvaluation",
    );
    collective.rawPayload = { a: { cost: 4.5, quality: 7.5 }, b: { cost: 5.5, quality: 7 } };
    collective.displayPayload = structuredClone(collective.rawPayload);
    available.resultsAnalysis.executions.push({
      executionKey: "base",
      executionType: "base",
      stageAnalyses: { alternativeEvaluation: { apiModelKey: "topsis_sort_2016", analysis: { facts: { status: "available" } } } },
    });
    getFinishedIssueInfo.mockResolvedValueOnce({ data: pending });
    getFinishedIssueInfo.mockResolvedValueOnce({ data: available });

    const { result } = renderHook(() => useFinishedIssueData({ selectedIssue: { id: "issue-1" }, open: true }));
    await waitFor(() => expect(result.current.collectiveResolutionStatus).toBe("pending"));
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.collectiveResolutionStatus).toBe("available"), { timeout: 4000 });
    expect(result.current.payload.evaluations.collective[0].rawPayload).toEqual(collective.rawPayload);
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(2);
  });

  it("keeps a recent Issue in preparation after its bounded retry and resolves on the next normal refresh", async () => {
    const pending = buildTopsisSortPendingCollectivePayload();
    const available = structuredClone(pending);
    const collective = available.evaluations.collective.find(
      (entry) => entry.stage === "alternativeEvaluation",
    );
    collective.rawPayload = { a: { cost: 4.5, quality: 7.5 }, b: { cost: 5.5, quality: 7 } };
    collective.displayPayload = structuredClone(collective.rawPayload);
    available.resultsAnalysis.executions.push({
      executionKey: "base",
      executionType: "base",
      stageAnalyses: { alternativeEvaluation: { apiModelKey: "topsis_sort_2016", analysis: { facts: { status: "available" } } } },
    });
    getFinishedIssueInfo.mockResolvedValueOnce({ data: pending });
    getFinishedIssueInfo.mockResolvedValueOnce({ data: structuredClone(pending) });
    getFinishedIssueInfo.mockResolvedValueOnce({ data: available });

    const { result } = renderHook(() => useFinishedIssueData({ selectedIssue: { id: "issue-1" }, open: true }));
    await waitFor(() => expect(getFinishedIssueInfo).toHaveBeenCalledTimes(2), { timeout: 4000 });
    expect(result.current.collectiveResolutionStatus).toBe("pending");
    await act(async () => { await result.current.refreshPayload(); });
    expect(result.current.collectiveResolutionStatus).toBe("available");
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(3);
  });

  it("marks historical TOPSIS-Sort without recoverable evidence unavailable without retrying", async () => {
    const historical = buildTopsisSortPendingCollectivePayload();
    historical.resultsAnalysis.executions.push({
      executionKey: "base",
      executionType: "base",
      stageAnalyses: { alternativeEvaluation: { apiModelKey: "topsis_sort_2016", analysis: { facts: { status: "unavailable" } } } },
    });
    getFinishedIssueInfo.mockResolvedValueOnce({ data: historical });
    const { result } = renderHook(() => useFinishedIssueData({ selectedIssue: { id: "issue-1" }, open: true }));
    await waitFor(() => expect(result.current.collectiveResolutionStatus).toBe("unavailable"));
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(1);
  });

  it("marks an old Finished Issue without persisted analysis unavailable without retrying", async () => {
    const historical = buildTopsisSortPendingCollectivePayload();
    historical.lifecycle.finishedAt = "2026-01-02T10:00:00.000Z";
    getFinishedIssueInfo.mockResolvedValueOnce({ data: historical });
    const { result } = renderHook(() => useFinishedIssueData({ selectedIssue: { id: "issue-1" }, open: true }));
    await waitFor(() => expect(result.current.collectiveResolutionStatus).toBe("unavailable"));
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(1);
  });

  it("keeps a Finished Issue integrity request failure distinct from missing historical evidence", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({ data: buildTopsisSortPendingCollectivePayload() });
    getFinishedIssueInfo.mockRejectedValueOnce(new Error("stored TOPSIS-Sort analysis evidence is invalid"));
    const { result } = renderHook(() => useFinishedIssueData({ selectedIssue: { id: "issue-1" }, open: true }));
    await waitFor(() => expect(result.current.collectiveResolutionStatus).toBe("pending"));
    await waitFor(() => expect(result.current.collectiveResolutionStatus).toBe("error"), { timeout: 4000 });
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("resolves the shared evaluation workspace selection", () => {
    const payload = buildFinishedIssuePayloadFixture();
    expect(resolveEvaluationsWorkspaceSelection({ payload, selectedPhase: 5, selectedExpertId: "expert-1" })).toEqual({ selectedExpertId: "expert-1", canShowCollective: true });
  });

  it("builds complete immutable parameter context data for base and scenario executions", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.expressionDomains.push({ id: "domain-2", name: "Ordinal", typeKey: "ordinal", definition: {} });
    payload.criteria.nodes.find((node) => node.id === "quality").expressionDomainId = "domain-2";
    const base = buildModelsParameterContextData({ payload, selectedExecution: selectFinishedIssueExecution(payload, "base") });
    const scenario = buildModelsParameterContextData({ payload, selectedExecution: selectFinishedIssueExecution(payload, "scenario-ok") });
    expect(base.alternatives.map((alternative) => alternative.id)).toEqual(["a", "b"]);
    expect(base.criteriaTree[0].children.map((criterion) => criterion.type)).toEqual([null, null]);
    expect(base.leafCriteria.map((criterion) => criterion.expressionDomain.id)).toEqual(["domain-1", "domain-2"]);
    expect(base.model.id).toBe("model-base");
    expect(scenario.model.id).toBe("model-scenario");
  });
});
