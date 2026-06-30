import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSnackbarAlertContext = vi.hoisted(() => vi.fn());

vi.mock(
  "../../../src/context/snackbarAlert/snackbarAlert.context",
  async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      useSnackbarAlertContext: mockUseSnackbarAlertContext,
    };
  }
);

vi.mock("../../../src/services/issue.service", () => ({
  createIssueScenario: vi.fn(),
  getFinishedIssueInfo: vi.fn(),
  getIssueScenarioById: vi.fn(),
  getIssueScenarios: vi.fn(),
  getModelsInfo: vi.fn(),
  removeIssueScenario: vi.fn(),
}));

import { useFinishedIssueDialogView } from "../../../src/features/finishedIssueDialog/hooks/useFinishedIssueDialogView.js";
import {
  createIssueScenario,
  getFinishedIssueInfo,
  getIssueScenarioById,
  getIssueScenarios,
  getModelsInfo,
  removeIssueScenario,
} from "../../../src/services/issue.service";
import {
  buildFinishedIssueBaseFixture,
  buildFinishedIssueWithoutSchemaModelsFixture,
  buildFinishedPendingScenarioFixture,
  buildFinishedScenarioFixture,
  buildFinishedScenarioRunsFixture,
  catalogScenarioModelFixture,
  schemaCompatibleScenarioModelFixture,
  schemaIncompatibleScenarioModelFixture,
} from "../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const buildSelectedIssue = () => ({
  _id: "issue-finished-robust",
  name: "Finished issue robustness",
});

const renderDialogHook = (props) =>
  renderHook((currentProps) => useFinishedIssueDialogView(currentProps), {
    initialProps: props,
  });

const waitForLoad = async (result) => {
  await waitFor(() => expect(result.current.dialog.loadingInfo).toBe(false));
};

describe("useFinishedIssueDialogView", () => {
  const showSnackbarAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSnackbarAlertContext.mockReturnValue({ showSnackbarAlert });
  });

  it("loads finished issue details when opened and supports selected issues that only expose _id", async () => {
    const issue = buildFinishedIssueBaseFixture();
    const runs = buildFinishedScenarioRunsFixture();

    getFinishedIssueInfo.mockResolvedValueOnce({
      data: {
        issueInfo: issue,
      },
    });
    getIssueScenarios.mockResolvedValueOnce(runs);

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);
    await waitFor(() =>
      expect(result.current.ratingsSection.selectedExpert).toBe("removed@example.com")
    );

    expect(getFinishedIssueInfo).toHaveBeenCalledWith("issue-finished-robust");
    expect(getIssueScenarios).toHaveBeenCalledWith("issue-finished-robust");
    expect(result.current.dialog.issue.summary.modelName).toBe("Consensus Model");
    expect(result.current.modelsSection.runs.map((run) => run._id)).toEqual([
      "scenario-1",
      "scenario-pending",
    ]);
    expect(result.current.header.selectedRunKey).toBe("base");
    expect(result.current.header.currentPhaseIndex).toBe(1);
    expect(result.current.summarySection.openDescriptionList).toBe(false);
    expect(result.current.summarySection.openCriteriaList).toBe(false);
    expect(result.current.summarySection.openAlternativeList).toBe(false);
    expect(result.current.summarySection.openConsensusInfoList).toBe(false);
    expect(result.current.summarySection.openExpertsList).toBe(false);
    expect(result.current.modelsSection.openParamsViewer).toBe(false);
    expect(result.current.modelsSection.addDialog.selectedModelId).toBe("");
    expect(result.current.modelsSection.addDialog.scenarioName).toBe("");
    expect(result.current.modelsSection.addDialog.paramsJson).toBe("{}");
  });

  it("does not load while the dialog is closed", () => {
    renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: false,
    });

    expect(getFinishedIssueInfo).not.toHaveBeenCalled();
    expect(getIssueScenarios).not.toHaveBeenCalled();
  });

  it("resets to a safe empty state when loading fails", async () => {
    getFinishedIssueInfo.mockRejectedValueOnce(new Error("load failed"));
    getIssueScenarios.mockResolvedValueOnce([]);

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    expect(result.current.dialog.issue).toEqual({});
    expect(result.current.modelsSection.runs).toEqual([]);
    expect(result.current.header.selectedRunKey).toBe("base");
    expect(result.current.header.currentPhaseIndex).toBe(0);
    expect(result.current.dialog.loadingInfo).toBe(false);
    expect(result.current.modelsSection.runsLoading).toBe(false);
  });

  it("clamps round navigation and updates ranking and ratings by phase", async () => {
    const issue = buildFinishedIssueBaseFixture();

    getFinishedIssueInfo.mockResolvedValueOnce({ data: issue });
    getIssueScenarios.mockResolvedValueOnce([]);

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);
    await waitFor(() =>
      expect(result.current.ratingsSection.selectedExpert).toBe("removed@example.com")
    );

    expect(result.current.header.showRounds).toBe(true);
    expect(result.current.header.roundsCount).toBe(2);
    expect(result.current.rankingSection.ranking[0].name).toBe("Beta");

    act(() => {
      result.current.graphsSection.handleNext();
    });
    expect(result.current.graphsSection.activeStep).toBe(1);

    act(() => {
      result.current.roundsNavigation.handlePreviousRound();
    });

    await waitFor(() => expect(result.current.header.currentPhaseIndex).toBe(0));
    await waitFor(() =>
      expect(result.current.ratingsSection.selectedExpert).toBe("anon@example.com")
    );
    expect(result.current.graphsSection.activeStep).toBe(0);
    expect(result.current.rankingSection.ranking[0].name).toBe("Alpha");
    expect(result.current.ratingsSection.evaluations).toEqual({
      stage: "phase-0-anon",
    });

    act(() => {
      result.current.roundsNavigation.handlePreviousRound();
    });
    expect(result.current.header.currentPhaseIndex).toBe(0);

    act(() => {
      result.current.roundsNavigation.handleNextRound();
      result.current.roundsNavigation.handleNextRound();
    });

    await waitFor(() => expect(result.current.header.currentPhaseIndex).toBe(1));
    expect(result.current.rankingSection.ranking[0].name).toBe("Beta");
  });

  it("selects scenario runs, caches successful fetches, and returns to the base issue", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({
      data: {
        issueInfo: buildFinishedIssueBaseFixture(),
      },
    });
    getIssueScenarios.mockResolvedValueOnce(buildFinishedScenarioRunsFixture());
    getIssueScenarioById.mockResolvedValueOnce({
      data: {
        scenario: buildFinishedScenarioFixture(),
      },
    });

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    await act(async () => {
      await result.current.modelsSection.handleSelectRun("scenario-1");
    });

    expect(getIssueScenarioById).toHaveBeenCalledTimes(1);
    expect(result.current.header.selectedRunKey).toBe("scenario-1");
    expect(result.current.header.currentPhaseIndex).toBe(0);
    expect(result.current.header.selectedModelNameView).toBe("Weighted Scenario Model");
    expect(result.current.rankingSection.ranking[0].name).toBe("Alpha");

    await act(async () => {
      await result.current.modelsSection.handleSelectRun("base");
      await result.current.modelsSection.handleSelectRun("scenario-1");
    });

    expect(result.current.header.selectedRunKey).toBe("scenario-1");
    expect(getIssueScenarioById).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.modelsSection.handleSelectRun("base");
    });

    expect(result.current.header.selectedRunKey).toBe("base");
    expect(result.current.header.currentPhaseIndex).toBe(1);
  });

  it("shows warnings and errors when scenario runs cannot be loaded safely", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({ data: buildFinishedIssueBaseFixture() });
    getIssueScenarios.mockResolvedValueOnce(buildFinishedScenarioRunsFixture());
    getIssueScenarioById
      .mockResolvedValueOnce({
        data: {
          scenario: buildFinishedPendingScenarioFixture(),
        },
      })
      .mockRejectedValueOnce(new Error("scenario fetch failed"));

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    await act(async () => {
      await result.current.modelsSection.handleSelectRun("scenario-pending");
    });

    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Scenario results not available yet.",
      "warning"
    );

    await act(async () => {
      await result.current.modelsSection.handleSelectRun("scenario-error");
    });

    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Could not load scenario.",
      "error"
    );
    expect(result.current.modelsSection.runsLoading).toBe(false);
  });

  it("ignores base removal and removes a selected scenario run successfully", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({ data: buildFinishedIssueBaseFixture() });
    getIssueScenarios.mockResolvedValueOnce(buildFinishedScenarioRunsFixture());
    getIssueScenarioById.mockResolvedValueOnce({
      data: {
        scenario: buildFinishedScenarioFixture(),
      },
    });
    removeIssueScenario.mockResolvedValueOnce({
      success: true,
    });
    getIssueScenarios.mockResolvedValueOnce({
      data: {
        scenarios: [buildFinishedScenarioRunsFixture()[1]],
      },
    });

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    await act(async () => {
      await result.current.modelsSection.handleRemoveSelectedRun();
    });
    expect(removeIssueScenario).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.modelsSection.handleSelectRun("scenario-1");
    });

    await waitFor(() => expect(result.current.header.selectedRunKey).toBe("scenario-1"));

    await act(async () => {
      await result.current.modelsSection.handleRemoveSelectedRun();
    });

    await waitFor(() => expect(result.current.header.selectedRunKey).toBe("base"));
    expect(removeIssueScenario).toHaveBeenCalledWith("scenario-1");
    expect(getIssueScenarios).toHaveBeenLastCalledWith("issue-finished-robust");
    expect(result.current.modelsSection.runs.map((run) => run._id)).toEqual([
      "scenario-pending",
    ]);
    expect(showSnackbarAlert).toHaveBeenCalledWith("Model removed.", "success");
  });

  it("keeps state safe when scenario removal fails", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({ data: buildFinishedIssueBaseFixture() });
    getIssueScenarios.mockResolvedValueOnce(buildFinishedScenarioRunsFixture());
    getIssueScenarioById.mockResolvedValueOnce({
      data: {
        scenario: buildFinishedScenarioFixture(),
      },
    });
    removeIssueScenario.mockResolvedValueOnce({
      success: false,
      message: "Could not remove model.",
    });

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    await act(async () => {
      await result.current.modelsSection.handleSelectRun("scenario-1");
    });

    await waitFor(() => expect(result.current.header.selectedRunKey).toBe("scenario-1"));

    await act(async () => {
      await result.current.modelsSection.handleRemoveSelectedRun();
    });

    expect(result.current.header.selectedRunKey).toBe("scenario-1");
    expect(showSnackbarAlert).toHaveBeenCalledWith("Could not remove model.", "error");
    expect(result.current.modelsSection.runsLoading).toBe(false);
  });

  it("requires a selected model before adding a schema-based scenario run", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({ data: buildFinishedIssueBaseFixture() });
    getIssueScenarios.mockResolvedValueOnce([]);

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    await act(async () => {
      await result.current.modelsSection.addDialog.handleAddModelRun();
    });

    expect(createIssueScenario).not.toHaveBeenCalled();
    expect(showSnackbarAlert).toHaveBeenCalledWith("Please select a model.", "warning");
  });

  it("loads catalog models in non-schema mode and rejects invalid JSON parameters", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({
      data: buildFinishedIssueWithoutSchemaModelsFixture(),
    });
    getIssueScenarios.mockResolvedValueOnce([]);
    getModelsInfo.mockResolvedValueOnce({
      data: {
        models: [catalogScenarioModelFixture],
      },
    });

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    await act(async () => {
      await result.current.modelsSection.addDialog.openAddDialog();
    });

    expect(getModelsInfo).toHaveBeenCalledTimes(1);
    expect(result.current.modelsSection.addDialog.modelsCatalog).toEqual([
      catalogScenarioModelFixture,
    ]);

    act(() => {
      result.current.modelsSection.addDialog.setSelectedModelId("catalog-model");
      result.current.modelsSection.addDialog.setParamsJson("{ invalid ");
    });

    await act(async () => {
      await result.current.modelsSection.addDialog.handleAddModelRun();
    });

    expect(createIssueScenario).not.toHaveBeenCalled();
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Parameters JSON is not valid.",
      "error"
    );
  });

  it("blocks incompatible schema models and invalid criteria weights", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({ data: buildFinishedIssueBaseFixture() });
    getIssueScenarios.mockResolvedValueOnce([]);

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    act(() => {
      result.current.modelsSection.addDialog.setSelectedModelId(
        schemaIncompatibleScenarioModelFixture.id
      );
    });

    await act(async () => {
      await result.current.modelsSection.addDialog.handleAddModelRun();
    });

    expect(createIssueScenario).not.toHaveBeenCalled();
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Selected model is not compatible with this issue scenario.",
      "error"
    );

    await act(async () => {
      await result.current.modelsSection.addDialog.openAddDialog();
    });

    act(() => {
      result.current.modelsSection.addDialog.setSelectedModelId(
        schemaCompatibleScenarioModelFixture.id
      );
    });

    await waitFor(() =>
      expect(
        result.current.modelsSection.addDialog.scenarioParamValues.threshold
      ).toBe(0.5)
    );

    act(() => {
      result.current.modelsSection.addDialog.setScenarioParamValues({
        threshold: 0.5,
        weights: {
          "criterion-cost": 1,
        },
      });
    });

    await act(async () => {
      await result.current.modelsSection.addDialog.handleAddModelRun();
    });

    expect(createIssueScenario).not.toHaveBeenCalled();
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Provide one weight for each criterion.",
      "error"
    );
    expect(result.current.modelsSection.addDialog.scenarioWeightsError).toBe(
      "Provide one weight for each criterion."
    );
  });

  it("adds a valid schema-based scenario run, refreshes runs, and selects the new scenario", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({
      data: {
        issueInfo: buildFinishedIssueBaseFixture(),
      },
    });
    getIssueScenarios.mockResolvedValueOnce(buildFinishedScenarioRunsFixture());
    createIssueScenario.mockResolvedValueOnce({
      success: true,
      data: {
        scenarioId: "scenario-2",
      },
    });
    getIssueScenarios.mockResolvedValueOnce({
      data: {
        scenarios: [
          ...buildFinishedScenarioRunsFixture(),
          {
            _id: "scenario-2",
            name: "Added Scenario",
            targetModelName: "Weighted Scenario Model",
          },
        ],
      },
    });
    getIssueScenarioById.mockResolvedValueOnce({
      data: {
        scenario: buildFinishedScenarioFixture({
          _id: "scenario-2",
          name: "Added Scenario",
        }),
      },
    });

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    await act(async () => {
      await result.current.modelsSection.addDialog.openAddDialog();
    });

    act(() => {
      result.current.modelsSection.addDialog.setSelectedModelId(
        schemaCompatibleScenarioModelFixture.id
      );
      result.current.modelsSection.addDialog.setScenarioName("  Added Scenario  ");
    });

    await waitFor(() =>
      expect(
        result.current.modelsSection.addDialog.scenarioParamValues.threshold
      ).toBe(0.5)
    );

    act(() => {
      result.current.modelsSection.addDialog.setScenarioParamValues({
        threshold: 0.75,
        weights: {
          "criterion-cost": 0.5,
          "criterion-quality": 0.5,
        },
      });
    });

    await act(async () => {
      await result.current.modelsSection.addDialog.handleAddModelRun();
    });

    expect(createIssueScenario).toHaveBeenCalledWith({
      issueId: "issue-finished-robust",
      scenarioName: "Added Scenario",
      targetModelId: "model-weighted",
      paramOverrides: {
        threshold: 0.75,
        weights: {
          "criterion-cost": 0.5,
          "criterion-quality": 0.5,
        },
      },
    });
    await waitFor(() => expect(result.current.header.selectedRunKey).toBe("scenario-2"));
    expect(getIssueScenarios).toHaveBeenLastCalledWith("issue-finished-robust");
    expect(getIssueScenarioById).toHaveBeenCalledWith("scenario-2");
    expect(result.current.modelsSection.addDialog.addOpen).toBe(false);
    expect(showSnackbarAlert).toHaveBeenCalledWith("Model run added.", "success");
  });

  it("surfaces scenario creation service errors", async () => {
    getFinishedIssueInfo.mockResolvedValueOnce({ data: buildFinishedIssueBaseFixture() });
    getIssueScenarios.mockResolvedValueOnce([]);
    createIssueScenario.mockRejectedValueOnce({
      response: {
        data: {
          message: "Backend rejected scenario creation.",
        },
      },
    });

    const { result } = renderDialogHook({
      selectedIssue: buildSelectedIssue(),
      openFinishedIssueDialog: true,
    });

    await waitForLoad(result);

    await act(async () => {
      await result.current.modelsSection.addDialog.openAddDialog();
    });

    act(() => {
      result.current.modelsSection.addDialog.setSelectedModelId(
        schemaCompatibleScenarioModelFixture.id
      );
    });

    await waitFor(() =>
      expect(
        result.current.modelsSection.addDialog.scenarioParamValues.threshold
      ).toBe(0.5)
    );

    await act(async () => {
      await result.current.modelsSection.addDialog.handleAddModelRun();
    });

    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Backend rejected scenario creation.",
      "error"
    );
    expect(result.current.modelsSection.addDialog.addLoading).toBe(false);
  });
});
