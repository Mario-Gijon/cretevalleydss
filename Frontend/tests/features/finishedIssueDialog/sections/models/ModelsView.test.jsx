import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ModelsView from "../../../../../src/features/finishedIssueDialog/sections/models/components/ModelsView.jsx";
import { buildModelsWorkspaceData } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsWorkspaceData.js";
import { selectFinishedIssueExecution, buildFinishedIssueExecutionOptions } from "../../../../../src/features/finishedIssueDialog/logic/selectFinishedIssueExecution.js";
import { buildParameterContext } from "../../../../../src/features/modelParameters/logic/buildModelParameterContext.js";
import { executionCarouselGridSx, selectedExecutionGridSx } from "../../../../../src/features/finishedIssueDialog/sections/models/models.styles.js";
import { buildFinishedIssuePayloadFixture, buildNonConsensusFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const buildState = (payload, overrides = {}) => ({
  addOpen: true,
  addLoading: false,
  scenarioName: "Historical sensitivity",
  selectedModelId: "model-scenario",
  selectedModel: payload.models.compatible[0],
  selectedModelCompatible: true,
  sourcePhases: [0, 5],
  selectedSourcePhase: 5,
  scenarioParamValues: {},
  availableModels: payload.models.compatible,
  ...overrides,
});

const actions = {
  selectExecution: vi.fn(),
  removeScenario: vi.fn(),
  openAdd: vi.fn(),
  closeAdd: vi.fn(),
  setScenarioName: vi.fn(),
  setSelectedModelId: vi.fn(),
  setSelectedSourcePhase: vi.fn(),
  setScenarioParamValues: vi.fn(),
  submitAdd: vi.fn(),
};

const renderView = (payload, selectedKey = "base") => {
  const selectedExecution = selectFinishedIssueExecution(payload, selectedKey);
  const data = buildModelsWorkspaceData({
    payload,
    selectedExecution,
    executionOptions: buildFinishedIssueExecutionOptions(payload),
  });
  const context = buildParameterContext({ model: selectedExecution.model });
  return render(<ThemeProvider theme={createTheme()}><ModelsView data={data} parameterContext={context} addParameterContext={context} state={{ add: buildState(payload) }} actions={actions} /></ThemeProvider>);
};

describe("ModelsView", () => {
  it("renders execution cards separately from the inline add action and keeps the selected detail factual", () => {
    const payload = buildFinishedIssuePayloadFixture();
    renderView(payload, "scenario-ok");

    const carousel = screen.getByTestId("models-execution-carousel");
    expect(within(carousel).getAllByRole("button").filter((button) => button.hasAttribute("aria-pressed"))).toHaveLength(3);
    expect(within(carousel).getAllByLabelText("Add model")).toHaveLength(1);
    expect(screen.getByText("Scenario · Scenario model")).toBeInTheDocument();
    expect(screen.getByLabelText("Source phase")).toBeInTheDocument();
    expect(screen.getByText("Raw output")).toBeInTheDocument();
  });

  it("shows source-phase selection only for consensus issues while retaining the required inline scenario form", () => {
    const consensusView = renderView(buildFinishedIssuePayloadFixture());
    expect(screen.getByRole("textbox", { name: /scenario name/i })).toBeRequired();
    expect(screen.getByLabelText("Source phase")).toBeInTheDocument();
    expect(screen.getAllByText("Enabled")).toHaveLength(1);

    consensusView.unmount();
    const payload = buildNonConsensusFinishedIssuePayloadFixture();
    renderView(payload);
    expect(screen.getByRole("textbox", { name: /scenario name/i })).toBeRequired();
    expect(screen.queryByLabelText("Source phase")).not.toBeInTheDocument();
  });

  it("uses responsive grid rules for one, two, and three execution cards without an add card", () => {
    expect(executionCarouselGridSx(1).gridTemplateColumns).toBe("repeat(1, minmax(0, 1fr))");
    expect(executionCarouselGridSx(2).gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
    expect(executionCarouselGridSx(3).gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(selectedExecutionGridSx.gridTemplateColumns).toEqual({
      xs: "minmax(0, 1fr)",
      lg: "minmax(250px, 0.75fr) minmax(0, 1.25fr)",
    });
  });
});
