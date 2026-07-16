import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSnackbar = vi.hoisted(() => vi.fn());
vi.mock("../../../src/context/snackbarAlert/snackbarAlert.context", () => ({ useSnackbarAlertContext: mockSnackbar }));
vi.mock("../../../src/services/issue.service", () => ({ createIssueScenario: vi.fn(), getFinishedIssueInfo: vi.fn(), removeIssueScenario: vi.fn() }));

import { useFinishedIssueDialogView } from "../../../src/features/finishedIssueDialog/hooks/useFinishedIssueDialogView.js";
import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../../../src/features/finishedIssueDialog/logic/selectFinishedIssueExecution.js";
import { buildEvaluationsData } from "../../../src/features/finishedIssueDialog/sections/evaluations/logic/buildEvaluationsData.js";
import { buildOverviewData } from "../../../src/features/finishedIssueDialog/sections/overview/logic/buildFinishedIssueOverviewData.js";
import { buildResultsAnalysisData } from "../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildResultsAnalysisData.js";
import { buildConsensusData } from "../../../src/features/finishedIssueDialog/sections/consensus/logic/buildConsensusData.js";
import { createIssueScenario, getFinishedIssueInfo, removeIssueScenario } from "../../../src/services/issue.service";
import { buildFinishedIssuePayloadFixture } from "../../mocks/fixtures/finishedIssueDialog.fixtures.js";

describe("Finished Issue canonical contract", () => {
  beforeEach(() => { vi.clearAllMocks(); mockSnackbar.mockReturnValue({ showSnackbarAlert: vi.fn() }); });

  it("selects base and scenarios without mutating canonical issue data and preserves sparse phase values", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const snapshot = JSON.stringify(payload);
    const base = selectFinishedIssueExecution(payload, "base");
    const scenario = selectFinishedIssueExecution(payload, "scenario-ok");
    expect(base.phaseResults.map((result) => result.phase)).toEqual([0, 5]);
    expect(base.sourcePhase).toBe(5);
    expect(scenario.type).toBe("scenario");
    expect(scenario.phaseResults).toEqual([]);
    expect(scenario.standardizedOutput.rankedAlternatives[0].alternativeId).toBe("a");
    expect(JSON.stringify(payload)).toBe(snapshot);
    expect(buildFinishedIssueExecutionOptions(payload).map((option) => option.key)).toEqual(["base", "scenario-ok", "scenario-error"]);
  });

  it("keeps overview, evaluations and consensus canonical while results follow execution", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const base = selectFinishedIssueExecution(payload, "base");
    const scenario = selectFinishedIssueExecution(payload, "scenario-ok");
    expect(buildOverviewData(payload).general.model).toBe("Base model");
    expect(buildResultsAnalysisData({ payload, selectedExecution: base, selectedPhase: 5 }).outcome.winner.name).toBe("Beta");
    expect(buildResultsAnalysisData({ payload, selectedExecution: scenario, selectedPhase: 5 }).outcome.winner.name).toBe("Alpha");
    expect(buildConsensusData(payload).rounds.map((round) => round.phase)).toEqual([0, 5]);
    const evaluations = buildEvaluationsData({ payload, selectedStage: "criteriaWeighting", selectedPhase: 1, selectedExpertId: "expert-1" });
    expect(evaluations.renderer).toMatchObject({ stage: "criteriaWeighting", readOnly: true });
    expect(evaluations.individual.payload).toEqual({ weights: [0.4, 0.6] });
    expect(evaluations.expertWeightSnapshot[0]).toEqual({ expertId: "expert-1", weight: 0.7 });
  });


  it("loads once, does not issue scenario reads, and refreshes after scenario writes", async () => {
    const payload = buildFinishedIssuePayloadFixture();
    getFinishedIssueInfo.mockResolvedValue({ data: payload });
    createIssueScenario.mockResolvedValue({ success: true, data: { scenarioId: "scenario-ok" } });
    removeIssueScenario.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFinishedIssueDialogView({ selectedIssue: { id: "issue-1" }, openFinishedIssueDialog: true }));
    await waitFor(() => expect(result.current.dialog.loading).toBe(false));
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(1);
    expect(result.current.header.selectedPhase).toBe(5);
    act(() => result.current.header.selectExecution("scenario-ok"));
    expect(result.current.runs.selectedExecution.type).toBe("scenario");
    expect(result.current.header.showRounds).toBe(false);
    act(() => result.current.header.selectExecution("base"));
    expect(result.current.header.selectedPhase).toBe(5);
    act(() => result.current.models.addDialog.setSelectedModelId("model-scenario"));
    await act(async () => { await result.current.models.addDialog.submit(); });
    expect(createIssueScenario).toHaveBeenCalledWith(expect.objectContaining({ issueId: "issue-1", targetModelId: "model-scenario" }));
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(2);
    act(() => result.current.header.selectExecution("scenario-ok"));
    await act(async () => { await result.current.models.removeSelectedScenario(); });
    expect(removeIssueScenario).toHaveBeenCalledWith("scenario-ok");
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(3);
    expect(result.current.header.selectedExecutionKey).toBe("base");
  });
});
