import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetEvaluationStructureEntryForStage = vi.hoisted(() => vi.fn());
const mockViewState = vi.hoisted(() => ({ lastProps: null }));

vi.mock("../../../src/features/decisionPlugins/evaluations", () => ({
  getEvaluationStructureEntryForStage:
    mockGetEvaluationStructureEntryForStage,
}));

import EvaluationStructureRenderer from "../../../src/features/issueEvaluation/components/EvaluationStructureRenderer.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const FuturePluginView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
}) => {
  mockViewState.lastProps = {
    decisionContext,
    evaluation,
    setEvaluation,
    collectiveEvaluation,
    readOnly,
  };

  return (
    <div>
      <span>Future plugin rendered</span>
      <span>{decisionContext.marker}</span>
      <span>{evaluation?.value || "no evaluation"}</span>
      <span>{collectiveEvaluation?.collective || "no collective"}</span>
      <span>{String(readOnly)}</span>
    </div>
  );
};

describe("EvaluationStructureRenderer registry dispatch", () => {
  beforeEach(() => {
    mockGetEvaluationStructureEntryForStage.mockReset();
    mockViewState.lastProps = null;
  });

  it("renders an arbitrary resolved plugin without a consumer-side structure branch", () => {
    mockGetEvaluationStructureEntryForStage.mockReturnValue({
      key: "futureStructure",
      stage: "alternativeEvaluation",
      View: FuturePluginView,
    });

    renderWithProviders(
      <EvaluationStructureRenderer
        decisionContext={{ marker: "canonical-context" }}
        stage="alternativeEvaluation"
        structureKey="futureStructure"
        evaluation={{ value: "individual-payload" }}
        collectiveEvaluation={{ collective: "collective-payload" }}
        readOnly
      />
    );

    expect(mockGetEvaluationStructureEntryForStage).toHaveBeenCalledWith({
      structureKey: "futureStructure",
      stage: "alternativeEvaluation",
    });
    expect(screen.getByText("Future plugin rendered")).toBeInTheDocument();
    expect(screen.getByText("canonical-context")).toBeInTheDocument();
    expect(screen.getByText("individual-payload")).toBeInTheDocument();
    expect(screen.getByText("collective-payload")).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(() =>
      mockViewState.lastProps.setEvaluation({ complete: true })
    ).not.toThrow();
    expect(() =>
      mockViewState.lastProps.setEvaluation((previous) => previous)
    ).toThrow("setEvaluation requires a complete evaluation object.");
  });

  it("renders nothing when the public registry cannot resolve the structure", () => {
    mockGetEvaluationStructureEntryForStage.mockReturnValue(null);

    const { container } = renderWithProviders(
      <EvaluationStructureRenderer
        decisionContext={{ marker: "canonical-context" }}
        stage="alternativeEvaluation"
        structureKey="missingStructure"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders an absence error instead of converting a missing evaluation to an object", () => {
    mockGetEvaluationStructureEntryForStage.mockReturnValue({
      key: "futureStructure",
      stage: "alternativeEvaluation",
      View: FuturePluginView,
    });

    renderWithProviders(
      <EvaluationStructureRenderer
        decisionContext={{ marker: "canonical-context" }}
        stage="alternativeEvaluation"
        structureKey="futureStructure"
        evaluation={null}
      />
    );

    expect(
      screen.getByText("Evaluation payload is unavailable.")
    ).toBeInTheDocument();
    expect(mockViewState.lastProps).toBeNull();
  });

  it("passes null unchanged during loading", () => {
    mockGetEvaluationStructureEntryForStage.mockReturnValue({
      key: "futureStructure",
      stage: "alternativeEvaluation",
      View: FuturePluginView,
    });

    renderWithProviders(
      <EvaluationStructureRenderer
        decisionContext={{ marker: "canonical-context" }}
        stage="alternativeEvaluation"
        structureKey="futureStructure"
        evaluation={null}
        loading
      />
    );

    expect(mockViewState.lastProps.evaluation).toBeNull();
  });
});
