import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const parameterFieldHostSpy = vi.hoisted(() => vi.fn());

vi.mock("../../../../../src/features/modelParameters/rendering", () => ({
  ParameterFieldHost: (props) => {
    parameterFieldHostSpy(props);
    return (
      <button type="button" onClick={() => props.onChange(0.75)}>
        Change {props.parameter.key}
      </button>
    );
  },
}));

import AddModelDialog from "../../../../../src/features/finishedIssueDialog/sections/models/components/AddModelDialog.jsx";
import { SCENARIO_DESCRIPTION_MAX } from "../../../../../src/features/finishedIssueDialog/logic/scenarioDraft.constants.js";

const enabledModel = {
  id: "enabled",
  name: "Enabled model",
  compatibility: { compatible: true, reasons: [] },
  parameterDefinitions: [
    {
      key: "alpha",
      label: "Alpha",
      parameterStructureKey: "numberGlobal",
      default: 0.5,
    },
  ],
};

const disabledModel = {
  id: "disabled",
  name: "Disabled model",
  compatibility: {
    compatible: false,
    reasons: ["Requires fuzzy data"],
  },
  parameterDefinitions: [],
};

const actions = {
  close: vi.fn(),
  setScenarioName: vi.fn(),
  setScenarioDescription: vi.fn(),
  setSelectedModelId: vi.fn(),
  setSelectedSourcePhase: vi.fn(),
  updateScenarioParameter: vi.fn(),
  submit: vi.fn(),
};

const buildState = (overrides = {}) => ({
  addLoading: false,
  scenarioName: "Sensitivity",
  scenarioDescription: "A valid scenario description.",
  selectedModelId: enabledModel.id,
  selectedModel: enabledModel,
  selectedModelCompatible: true,
  selectedSourcePhase: 5,
  sourcePhases: [0, 5],
  scenarioParamValues: { alpha: 0.5 },
  availableModels: [enabledModel, disabledModel],
  ...overrides,
});

const dialog = (state, consensusEnabled = true) => (
  <ThemeProvider theme={createTheme()}>
    <AddModelDialog
      open
      consensusEnabled={consensusEnabled}
      state={state}
      parameterContext={{ marker: "parameter-context" }}
      actions={actions}
    />
  </ThemeProvider>
);

describe("AddModelDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders compatible options and explains why unavailable models are disabled", () => {
    render(dialog(buildState()));

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Model" }));
    const disabledOption = screen
      .getByText("Disabled model")
      .closest('[role="option"]');

    expect(disabledOption).toHaveAttribute("aria-disabled", "true");
    expect(disabledOption).toHaveAttribute("title", "Requires fuzzy data");
  });

  it("preserves the submit button boundary and selected compatibility message", () => {
    const { rerender } = render(
      dialog(
        buildState({ scenarioDescription: "x".repeat(SCENARIO_DESCRIPTION_MAX) })
      )
    );
    expect(screen.getByRole("button", { name: "Add model" })).toBeEnabled();

    rerender(
      dialog(
        buildState({
          scenarioDescription: "x".repeat(SCENARIO_DESCRIPTION_MAX + 1),
        })
      )
    );
    expect(screen.getByRole("button", { name: "Add model" })).toBeDisabled();

    rerender(
      dialog(
        buildState({
          selectedModelId: disabledModel.id,
          selectedModel: disabledModel,
          selectedModelCompatible: false,
        })
      )
    );
    expect(screen.getByText("Requires fuzzy data")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add model" })).toBeDisabled();
  });

  it("shows source phase only for consensus-enabled issues", () => {
    const { rerender } = render(dialog(buildState(), false));
    expect(screen.queryByLabelText("Source phase")).not.toBeInTheDocument();

    rerender(dialog(buildState(), true));
    expect(screen.getByLabelText("Source phase")).toBeInTheDocument();
  });

  it("keeps parameter rendering in ParameterFieldHost and emits a named update", () => {
    render(dialog(buildState()));

    expect(parameterFieldHostSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        parameter: expect.objectContaining({ key: "alpha" }),
        value: 0.5,
        parameterContext: { marker: "parameter-context" },
        disabled: false,
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Change alpha" }));
    expect(actions.updateScenarioParameter).toHaveBeenCalledWith("alpha", 0.75);
  });
});
