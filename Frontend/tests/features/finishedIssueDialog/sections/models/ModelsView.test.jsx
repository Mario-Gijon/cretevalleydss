import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ModelsView from "../../../../../src/features/finishedIssueDialog/sections/models/components/ModelsView.jsx";
import { buildModelsCardsData } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsCardsData.js";
import { capacityForExecutionGallery } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/executionGalleryCapacity.js";
import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../../../../../src/features/finishedIssueDialog/logic/selectFinishedIssueExecution.js";
import { buildParameterContext } from "../../../../../src/features/modelParameters/logic/buildModelParameterContext.js";
import { addModelCardSx, executionCardSx, executionGalleryGridSx, scenarioCarouselControlSx } from "../../../../../src/features/finishedIssueDialog/sections/models/models.styles.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const actions = {
  selectExecution: vi.fn(), removeScenario: vi.fn(), openAdd: vi.fn(), closeAdd: vi.fn(),
  setScenarioName: vi.fn(), setScenarioDescription: vi.fn(), setSelectedModelId: vi.fn(),
  setSelectedSourcePhase: vi.fn(), updateScenarioParameter: vi.fn(), submitAdd: vi.fn(),
};

const buildState = (payload, overrides = {}) => ({
  addOpen: false, addLoading: false, scenarioName: "Historical sensitivity", scenarioDescription: "A saved scenario description.",
  selectedModelId: "model-scenario", selectedModel: payload.models.compatible[0], selectedModelCompatible: true,
  sourcePhases: [0, 5], selectedSourcePhase: 5, scenarioParamValues: {}, availableModels: payload.models.compatible, ...overrides,
});

const renderView = (payload, selectedKey = "base", state = buildState(payload)) => {
  const selectedExecution = selectFinishedIssueExecution(payload, selectedKey);
  const data = buildModelsCardsData({ payload, selectedExecution, executionOptions: buildFinishedIssueExecutionOptions(payload) });
  const context = buildParameterContext({ model: data.selectedExecution.model });
  return render(<ThemeProvider theme={createTheme()}><ModelsView data={data} parameterContext={context} addParameterContext={context} state={{ add: state }} actions={actions} /></ThemeProvider>);
};

beforeEach(() => vi.clearAllMocks());

describe("ModelsView", () => {
  it("keeps Base and Add model visible with no scenarios while retaining Base details", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios = [];
    renderView(payload);
    const gallery = screen.getByTestId("models-execution-gallery");
    expect(within(gallery).getAllByText("Base").length).toBeGreaterThan(0);
    expect(within(gallery).getByLabelText("Add model")).toBeInTheDocument();
    expect(within(gallery).queryByLabelText("Previous scenarios")).not.toBeInTheDocument();
    expect(within(gallery).queryByLabelText("Next scenarios")).not.toBeInTheDocument();
    expect(screen.getByTitle("Base · Base model")).toHaveTextContent("Selected execution");
    expect(screen.getByText("Raw output")).toBeInTheDocument();
  });

  it("renders Base, stored scenarios, and the Add model card without old card metadata", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios = [payload.scenarios[0]];
    payload.scenarios[0].description = "Test description";
    payload.scenarios[0].computedAt = "2026-01-02T10:00:00.000Z";
    renderView(payload, "scenario-ok");
    expect(screen.getAllByText("Base").length).toBeGreaterThan(0);
    expect(screen.getByText("Scenario")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Add model")).toHaveLength(1);
    expect(screen.getAllByText("Computed at")).toHaveLength(2);
    expect(screen.getAllByText("View paper")).toHaveLength(2);
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    expect(screen.queryByText("Model information")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Remove Scenario")).toBeInTheDocument();
    expect(screen.queryByLabelText("Actions for Scenario")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Base execution cannot be removed").length).toBeGreaterThan(0);
    expect(screen.getByTestId("LayersRoundedIcon")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove Scenario"));
    expect(actions.removeScenario).toHaveBeenCalledWith("scenario-ok");
    expect(actions.selectExecution).not.toHaveBeenCalled();
  });

  it("keeps Base and Add model fixed while only scenarios move through the desktop carousel", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios.push({
      ...payload.scenarios[0],
      id: "scenario-third",
      name: "Third scenario",
      description: "Third scenario description",
    });
    renderView(payload);

    expect(screen.getByTestId("models-scenario-carousel")).toBeInTheDocument();
    expect(screen.getAllByText("Base").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Add model")).toBeInTheDocument();
    expect(screen.getByText("Scenario")).toBeInTheDocument();
    expect(screen.queryByText("Third scenario")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Previous scenarios")).toBeDisabled();
    expect(screen.getByLabelText("Next scenarios")).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText("Next scenarios"));
    expect(screen.getAllByText("Base").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Add model")).toBeInTheDocument();
    expect(screen.getByText("Third scenario")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous scenarios")).not.toBeDisabled();
    expect(screen.getByLabelText("Next scenarios")).toBeDisabled();
  });

  it("brings a selected scenario into the scenario-only window", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios.push({
      ...payload.scenarios[0],
      id: "scenario-third",
      name: "Third scenario",
      description: "Third scenario description",
    });
    renderView(payload, "scenario-third");

    expect(screen.getByText("Third scenario")).toBeInTheDocument();
    expect(screen.getAllByText("Base").length).toBeGreaterThan(0);
  });

  it("opens one Dialog with required name and description fields", () => {
    const payload = buildFinishedIssuePayloadFixture();
    renderView(payload, "base", buildState(payload, { addOpen: true }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const scenarioNameField = screen.getByRole("textbox", { name: /scenario name/i });
    const scenarioDescriptionField = screen.getByRole("textbox", { name: /scenario description/i });
    expect(scenarioNameField).toBeRequired();
    expect(scenarioDescriptionField).toBeRequired();
    expect(scenarioNameField.closest(".MuiInputBase-root")).toHaveClass("MuiInputBase-colorSecondary");
    expect(scenarioDescriptionField.closest(".MuiInputBase-root")).toHaveClass("MuiInputBase-colorSecondary");
    expect(screen.getByText(/\/320$/)).toBeInTheDocument();
    expect(screen.getByLabelText("Model")).toBeInTheDocument();
    expect(screen.getByLabelText("Source phase")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    const dialogContent = dialog.querySelector(".MuiDialogContent-root");
    expect(dialogContent).toBeInTheDocument();
    expect(window.getComputedStyle(dialogContent).paddingTop).toBe("12px");
    expect(dialogContent.querySelector("input")).toBe(scenarioNameField);
    expect(window.getComputedStyle(dialog).opacity).toBe("1");
    expect(window.getComputedStyle(dialog).backgroundColor).toBe("rgb(7, 19, 31)");
    expect(window.getComputedStyle(dialog).backgroundImage).toContain("linear-gradient");
    expect(document.querySelector(".MuiBackdrop-root")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Model" }).closest(".MuiInputBase-root")).toHaveClass("MuiInputBase-colorSecondary");
    expect(screen.getByRole("combobox", { name: "Source phase" }).closest(".MuiInputBase-root")).toHaveClass("MuiInputBase-colorSecondary");
  });

  it("keeps responsive scenario capacities and meaningful card dimensions", () => {
    expect(capacityForExecutionGallery({ mobile: true, tablet: false })).toBe(1);
    expect(capacityForExecutionGallery({ mobile: false, tablet: true })).toBe(1);
    expect(capacityForExecutionGallery({ mobile: false, tablet: false })).toBe(2);
    expect(executionGalleryGridSx({ scenarioCount: 0, carousel: false }).gridTemplateColumns.lg).toBe("repeat(2, minmax(260px, 1fr))");
    expect(executionGalleryGridSx({ scenarioCount: 2, carousel: false }).gridTemplateColumns.lg).toBe("repeat(4, minmax(260px, 1fr))");
    expect(executionCardSx(false, false).minHeight).toEqual({ xs: 250, md: 290 });
    expect(addModelCardSx().minHeight).toEqual({ xs: 250, md: 290 });
    expect(addModelCardSx().minWidth).toEqual({ xs: 0, sm: 260 });
    expect(scenarioCarouselControlSx).toMatchObject({ width: 36, height: 76, borderRadius: 2 });
  });
});
