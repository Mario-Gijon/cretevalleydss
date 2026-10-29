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

  it("carries each selected phase's persisted result structure metadata", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const basePhase = payload.phaseResults.find((result) => result.stage === "alternativeEvaluation" && result.phase === 0);
    basePhase.resultStructureKey = "sorting";
    basePhase.resultStructureVersion = 1;
    const scenarioPhase = payload.scenarios[0].phaseResults.find((result) => result.phase === 0);
    scenarioPhase.resultStructureKey = "sorting";
    scenarioPhase.resultStructureVersion = 1;

    expect(selectFinishedIssueExecution(payload, "base", 0)).toMatchObject({
      sourcePhase: 0,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
    });
    expect(selectFinishedIssueExecution(payload, "scenario-ok", 0)).toMatchObject({
      sourcePhase: 0,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
    });
  });

  it("resolves AHPSort I expert names from the execution roster and the scenario's saved snapshot", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const basePhase = payload.phaseResults.find((result) => result.stage === "alternativeEvaluation" && result.phase === 0);
    basePhase.expertIds = ["expert-2", "expert-1"];
    payload.participantHistory = {
      records: [
        { expert: { id: "expert-1", name: "Avery" } },
        { expert: { id: "expert-2", name: "Morgan" } },
        { expert: { id: "expert-current-only", name: "Current participant" } },
      ],
    };
    const base = selectFinishedIssueExecution(payload, "base", 0);
    expect(base.expertRoster).toEqual([
      { id: "expert-2", name: "Morgan" },
      { id: "expert-1", name: "Avery" },
    ]);

    const scenarioPhase = payload.scenarios[0].phaseResults.find((result) => result.phase === 0);
    scenarioPhase.requestSnapshot = {
      evaluations: [{ expert: { id: "expert-1", name: "Scenario Avery" } }],
    };
    const scenario = selectFinishedIssueExecution(payload, "scenario-ok", 0);
    expect(scenario.expertRoster).toEqual([{ id: "expert-1", name: "Scenario Avery" }]);
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
    expect(result.current.resultsAnalysisNavigation.activeView).toBe("visualizations");
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

  it("refreshes a pending TOPSIS-Sort collective when the user navigates between Finished Issue sections", async () => {
    const pending = buildFinishedIssuePayloadFixture();
    pending.lifecycle.finishedAt = new Date().toISOString();
    pending.models.base.technical = { apiModelKey: "topsis_sort_2016" };
    pending.resultsAnalysis = { executions: [] };
    const collective = pending.evaluations.collective.find((entry) => entry.stage === "alternativeEvaluation");
    collective.rawPayload = null;
    collective.displayPayload = null;

    const available = structuredClone(pending);
    const availableCollective = available.evaluations.collective.find((entry) => entry.stage === "alternativeEvaluation");
    availableCollective.rawPayload = { a: { cost: 4.5, quality: 7.5 }, b: { cost: 5.5, quality: 7 } };
    availableCollective.displayPayload = structuredClone(availableCollective.rawPayload);
    getFinishedIssueInfo.mockResolvedValueOnce({ data: pending });
    getFinishedIssueInfo.mockResolvedValueOnce({ data: available });

    const { result } = renderHook(() => useFinishedIssueDialogView({ selectedIssue: { id: "issue-1" }, openFinishedIssueDialog: true }));
    await waitFor(() => expect(result.current.dialog.collectiveResolutionStatus).toBe("pending"));
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(1);

    act(() => result.current.navigation.selectTab("evaluations"));
    await waitFor(() => expect(result.current.dialog.collectiveResolutionStatus).toBe("available"));
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(2);
    expect(result.current.dialog.payload.evaluations.collective.find((entry) => entry.stage === "alternativeEvaluation").rawPayload)
      .toEqual(availableCollective.rawPayload);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1700)); });
    expect(getFinishedIssueInfo).toHaveBeenCalledTimes(2);
  });

  it("keeps Results Analysis selection independent and stable across analysis subviews", async () => {
    getFinishedIssueInfo.mockResolvedValue({ data: buildFinishedIssuePayloadFixture() });
    const { result } = renderHook(() => useFinishedIssueDialogView({ selectedIssue: { id: "issue-1" }, openFinishedIssueDialog: true }));

    await waitFor(() => expect(result.current.dialog.loading).toBe(false));
    expect(result.current.resultsAnalysisNavigation.activeView).toBe("visualizations");
    act(() => result.current.resultsAnalysis.selection.addExecution("scenario-ok"));
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["base", "scenario-ok"]);

    act(() => result.current.resultsAnalysisNavigation.setActiveView("interpretation"));
    expect(result.current.resultsAnalysisNavigation.activeView).toBe("interpretation");
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["base", "scenario-ok"]);
    act(() => result.current.resultsAnalysisNavigation.setActiveView("visualizations"));
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["base", "scenario-ok"]);
    act(() => result.current.resultsAnalysis.selection.removeExecution("base"));
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["scenario-ok"]);
    act(() => result.current.resultsAnalysisNavigation.setActiveView("outcome"));
    expect(result.current.resultsAnalysisNavigation.activeView).toBe("visualizations");
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["scenario-ok"]);

    act(() => result.current.resultsAnalysisNavigation.setActiveView("interpretation"));
    act(() => result.current.navigation.selectTab("dashboard"));
    act(() => result.current.navigation.selectTab("results-analysis"));
    expect(result.current.resultsAnalysisNavigation.activeView).toBe("visualizations");
    expect(result.current.resultsAnalysis.selection.selectedExecutionKeys).toEqual(["scenario-ok"]);
    expect(result.current.runs.selectedExecutionKey).toBe("base");
  });
});
