import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ModelsView from "../../../../../src/features/finishedIssueDialog/sections/models/components/ModelsView.jsx";
import { buildModelsCardsData } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsCardsData.js";
import { capacityForExecutionGallery } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/executionGalleryCapacity.js";
import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../../../../../src/features/finishedIssueDialog/logic/selectFinishedIssueExecution.js";
import { buildParameterContext } from "../../../../../src/features/modelParameters/logic/buildModelParameterContext.js";
import { addModelCardSx, executionCardSx, executionCarouselControlSx, executionCarouselItemSx, executionCarouselTrackSx, executionGalleryGridSx } from "../../../../../src/features/finishedIssueDialog/sections/models/models.styles.js";
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

const viewFor = (payload, selectedKey = "base", state = buildState(payload)) => {
  const selectedExecution = selectFinishedIssueExecution(payload, selectedKey);
  const data = buildModelsCardsData({ payload, selectedExecution, executionOptions: buildFinishedIssueExecutionOptions(payload) });
  const context = buildParameterContext({ model: data.selectedExecution.model });
  return <ThemeProvider theme={createTheme()}><ModelsView data={data} parameterContext={context} addParameterContext={context} state={{ add: state }} actions={actions} /></ThemeProvider>;
};

const renderView = (payload, selectedKey = "base", state = buildState(payload)) => render(viewFor(payload, selectedKey, state));

beforeEach(() => vi.clearAllMocks());

describe("ModelsView", () => {
  it("keeps Base and Add model visible with no scenarios while retaining Base details", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios = [];
    renderView(payload);
    const gallery = screen.getByTestId("models-execution-gallery");
    const carousel = within(gallery).getByTestId("models-execution-carousel");
    expect(within(carousel).getAllByTitle("Base")).toHaveLength(1);
    expect(within(gallery).getByLabelText("Add model")).toBeInTheDocument();
    expect(within(carousel).queryByLabelText("Add model")).not.toBeInTheDocument();
    expect(within(gallery).queryByLabelText("Previous executions")).not.toBeInTheDocument();
    expect(within(gallery).queryByLabelText("Next executions")).not.toBeInTheDocument();
    expect(screen.getByTitle("Selected execution — Base")).toHaveTextContent("Selected execution — Base");
    expect(screen.getByTitle("Selected execution — Base")).not.toHaveTextContent("·");
    expect(screen.getByTitle("Selected execution — Base")).not.toHaveTextContent("Base model");
    expect(screen.queryByTitle("Base · Base model")).not.toBeInTheDocument();
    expect(screen.getByText("Raw output")).toBeInTheDocument();
  });

  it("renders Base, stored scenarios, and the Add model card without old card metadata", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios = [payload.scenarios[0]];
    payload.scenarios[0].description = "Test description";
    payload.scenarios[0].execution.completedAt = "2026-01-02T10:00:00.000Z";
    renderView(payload, "scenario-ok");
    expect(screen.getAllByText("Base").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Scenario")).toBeInTheDocument();
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

  it("moves Base, scenarios, and the final Add model action through one execution carousel", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios.push({
      ...payload.scenarios[0],
      id: "scenario-third",
      name: "Third scenario",
      description: "Third scenario description",
    });
    renderView(payload);

    const carousel = screen.getByTestId("models-execution-carousel");
    expect(within(carousel).getAllByTitle("Base")).toHaveLength(1);
    const track = screen.getByTestId("models-execution-carousel-track");
    expect(within(track).getByTestId("models-add-model-carousel-slide")).toContainElement(within(track).getByLabelText("Add model"));
    expect(screen.getAllByLabelText("Add model")).toHaveLength(1);
    expect(screen.getByTitle("Scenario")).toBeInTheDocument();
    expect(screen.getByTitle("Third scenario")).toBeInTheDocument();
    expect(track).toHaveAttribute("data-carousel-start", "0");
    expect(screen.getByLabelText("Previous executions")).toBeDisabled();
    expect(screen.getByLabelText("Next executions")).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText("Next executions"));
    expect(track).toHaveAttribute("data-carousel-start", "1");
    expect(screen.getByLabelText("Previous executions")).not.toBeDisabled();
    expect(screen.getByLabelText("Next executions")).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText("Next executions"));
    expect(track).toHaveAttribute("data-carousel-start", "2");
    expect(screen.getByLabelText("Next executions")).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Previous executions"));
    expect(track).toHaveAttribute("data-carousel-start", "1");

    fireEvent.click(screen.getByLabelText("Add model"));
    expect(actions.openAdd).toHaveBeenCalledOnce();
    expect(actions.selectExecution).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Add model")).not.toHaveAttribute("aria-pressed");
  });

  it("brings a selected execution into the shared carousel window and keeps Base selectable", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios.push({
      ...payload.scenarios[0],
      id: "scenario-third",
      name: "Third scenario",
      description: "Third scenario description",
    });
    const { unmount } = renderView(payload, "scenario-third");

    expect(screen.getByTitle("Third scenario")).toBeInTheDocument();
    expect(screen.getByTestId("models-execution-carousel-track")).toHaveAttribute("data-carousel-start", "1");

    unmount();
    renderView(payload);
    fireEvent.click(screen.getByTitle("Base"));
    expect(actions.selectExecution).toHaveBeenCalledWith("base");
    expect(actions.removeScenario).not.toHaveBeenCalledWith("base");
  });

  it("clamps the carousel window after scenarios are removed", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios.push({
      ...payload.scenarios[0],
      id: "scenario-third",
      name: "Third scenario",
    });
    const view = renderView(payload, "scenario-third");

    expect(screen.getByTitle("Third scenario")).toBeInTheDocument();

    payload.scenarios = [payload.scenarios[0]];
    view.rerender(viewFor(payload, "base"));

    expect(screen.getByTitle("Base")).toBeInTheDocument();
    expect(screen.queryByLabelText("Previous executions")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next executions")).not.toBeInTheDocument();
  });

  it("keeps exactly three desktop executions static with the full Add model card", () => {
    const payload = buildFinishedIssuePayloadFixture();
    renderView(payload);

    expect(screen.queryByLabelText("Previous executions")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next executions")).not.toBeInTheDocument();
    expect(screen.getByTestId("models-add-model-card")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Add model")).toHaveLength(1);
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
    expect(capacityForExecutionGallery({ mobile: false, tablet: true })).toBe(2);
    expect(capacityForExecutionGallery({ mobile: false, tablet: false })).toBe(3);
    expect(executionGalleryGridSx({ executionCount: 1, carousel: false }).gridTemplateColumns.lg).toBe("repeat(2, minmax(260px, 1fr))");
    expect(executionGalleryGridSx({ executionCount: 3, carousel: false }).gridTemplateColumns.lg).toBe("repeat(4, minmax(260px, 1fr))");
    expect(executionCardSx(false, false).minHeight).toEqual({ xs: 250, md: 290 });
    expect(addModelCardSx().minHeight).toEqual({ xs: 250, md: 290 });
    expect(addModelCardSx().minWidth).toEqual({ xs: 0, sm: 260 });
    expect(addModelCardSx({ carousel: true })).toMatchObject({ width: "100%", minWidth: 0, height: "100%" });
    expect(executionCarouselItemSx(3)).toMatchObject({ flex: "0 0 calc((100% - 20px) / 3)", minWidth: 0, "& > *": { height: "100%" } });
    expect(executionCarouselControlSx).toMatchObject({ width: 40, height: "100%", alignSelf: "stretch", borderRadius: 2 });
    expect(executionCarouselTrackSx({ capacity: 3, start: 1 })).toMatchObject({
      transform: "translateX(calc(-33.333333333333336% - 3.3333333333333335px))",
      transition: "transform 260ms cubic-bezier(0.4, 0, 0.2, 1)",
    });
    expect(executionCarouselTrackSx({ capacity: 3, start: 1 })["@media (prefers-reduced-motion: reduce)"]).toEqual({ transitionDuration: "1ms" });
  });
});
