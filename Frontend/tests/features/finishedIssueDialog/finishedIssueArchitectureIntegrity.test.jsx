import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/issue.service", () => ({ getFinishedIssueInfo: vi.fn() }));

import { getFinishedIssueInfo } from "../../../src/services/issue.service";
import { useFinishedIssueData } from "../../../src/features/finishedIssueDialog/hooks/useFinishedIssueData.js";
import { resolveEvaluationsSelection } from "../../../src/features/finishedIssueDialog/sections/evaluations/logic/resolveEvaluationsSelection.js";
import { buildModelsParameterContextData } from "../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsData.js";
import { selectFinishedIssueExecution } from "../../../src/features/finishedIssueDialog/logic/selectFinishedIssueExecution.js";
import { buildFinishedIssuePayloadFixture } from "../../mocks/fixtures/finishedIssueDialog.fixtures.js";

describe("Finished Issue architecture integrity", () => {
  it("does not unwrap retired response-shape wrappers", async () => {
    const canonical = buildFinishedIssuePayloadFixture();
    getFinishedIssueInfo.mockResolvedValueOnce({ data: { payload: canonical } });
    const { result } = renderHook(() => useFinishedIssueData({ selectedIssue: { id: "issue-1" }, open: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.payload).toEqual({ payload: canonical });
    expect(result.current.payload.issue).toBeUndefined();
  });

  it("resolves only evaluation selection state", () => {
    const payload = buildFinishedIssuePayloadFixture();
    expect(resolveEvaluationsSelection({ payload, selectedStage: "criteriaWeighting", selectedPhase: 1, selectedExpertId: "expert-1" })).toEqual({ selectedStage: "criteriaWeighting", selectedPhase: 1, selectedExpertId: "expert-1", canShowCollective: true });
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
