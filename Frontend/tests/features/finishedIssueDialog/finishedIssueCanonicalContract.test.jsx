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
import { buildConsensusEvolutionData } from "../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildConsensusEvolutionData.js";
import { createIssueScenario, getFinishedIssueInfo, removeIssueScenario } from "../../../src/services/issue.service";
import { buildFinishedIssuePayloadFixture } from "../../mocks/fixtures/finishedIssueDialog.fixtures.js";

describe("Finished Issue canonical contract", () => {
  beforeEach(() => { vi.clearAllMocks(); mockSnackbar.mockReturnValue({ showSnackbarAlert: vi.fn() }); });

  it("selects base and scenarios without mutating canonical issue data and preserves sparse phase values", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const snapshot = JSON.stringify(payload);
    const base = selectFinishedIssueExecution(payload, "base");
    const scenario = selectFinishedIssueExecution(payload, "scenario-ok", 0);
    expect(base.phaseResults.map((result) => result.phase)).toEqual([0, 5]);
    expect(base.sourcePhase).toBe(5);
    expect(scenario.type).toBe("scenario");
    expect(scenario.phaseResults.map((result) => result.phase)).toEqual([0, 5]);
    expect(scenario.sourcePhase).toBe(0);
    expect(scenario.standardizedOutput.rankedAlternatives[0].alternativeId).toBe("a");
    expect(JSON.stringify(payload)).toBe(snapshot);
    expect(buildFinishedIssueExecutionOptions(payload).map((option) => option.key)).toEqual(["base", "scenario-ok", "scenario-secondary"]);
  });

  it("keeps overview, evaluations and consensus canonical while results follow execution", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const base = selectFinishedIssueExecution(payload, "base");
    const scenario = selectFinishedIssueExecution(payload, "scenario-ok");
    expect(buildOverviewData(payload).general.model).toBe("Base model");
    expect(buildResultsAnalysisData({ payload, selectedExecution: base, selectedPhase: 5 }).outcome.winner.name).toBe("Beta");
    expect(buildResultsAnalysisData({ payload, selectedExecution: scenario, selectedPhase: 5 }).outcome.winner.name).toBe("Alpha");
    expect(buildConsensusEvolutionData(payload).rounds.map((round) => round.phase)).toEqual([0, 5]);
    const evaluations = buildEvaluationsData({ payload, selectedStage: "criteriaWeighting", selectedPhase: 1, selectedExpertId: "expert-1" });
    expect(evaluations.renderer).toMatchObject({ stage: "criteriaWeighting", readOnly: true });
    expect(evaluations.individual.payload).toEqual({ weightsByCriterion: {} });
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
    expect(result.current.navigation.availableTabs).toEqual(["dashboard", "overview", "results-analysis", "evaluations", "models"]);
    expect(result.current.header.showRounds).toBe(true);
    act(() => result.current.runs.selectExecution("scenario-ok"));
    expect(result.current.runs.selectedExecution.type).toBe("scenario");
    expect(result.current.header.showRounds).toBe(true);
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["base"]);
    act(() => result.current.runs.selectExecution("base"));
    act(() => result.current.models.addDialog.setScenarioName("Sensitivity"));
    act(() => result.current.models.addDialog.setScenarioDescription("A valid scenario description."));
    expect(result.current.header.selectedPhase).toBe(5);
    act(() => result.current.models.addDialog.setSelectedModelId("model-scenario"));
    await act(async () => { await result.current.models.addDialog.submit(); });
    expect(createIssueScenario).toHaveBeenCalledWith(expect.objectContaining({ issueId: "issue-1", targetModelId: "model-scenario" }));
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(2);
    act(() => result.current.runs.selectExecution("scenario-ok"));
    await act(async () => { await result.current.models.removeScenario("scenario-ok"); });
    expect(removeIssueScenario).toHaveBeenCalledWith("scenario-ok");
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(3);
    expect(result.current.runs.selectedExecutionKey).toBe("base");
  });

  it("keeps Results Analysis selection independent and stable across analysis subviews", async () => {
    getFinishedIssueInfo.mockResolvedValue({ data: buildFinishedIssuePayloadFixture() });
    const { result } = renderHook(() => useFinishedIssueDialogView({ selectedIssue: { id: "issue-1" }, openFinishedIssueDialog: true }));

    await waitFor(() => expect(result.current.dialog.loading).toBe(false));
    act(() => result.current.resultsAnalysis.selection.addExecution("scenario-ok"));
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["base", "scenario-ok"]);

    act(() => result.current.resultsAnalysisNavigation.setActiveView("visualizations"));
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["base", "scenario-ok"]);
    act(() => result.current.resultsAnalysisNavigation.setActiveView("interpretation"));
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["base", "scenario-ok"]);
    act(() => result.current.resultsAnalysis.selection.removeExecution("base"));
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["scenario-ok"]);
    act(() => result.current.resultsAnalysisNavigation.setActiveView("outcome"));
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["scenario-ok"]);
    expect(result.current.runs.selectedExecutionKey).toBe("base");
  });
});
