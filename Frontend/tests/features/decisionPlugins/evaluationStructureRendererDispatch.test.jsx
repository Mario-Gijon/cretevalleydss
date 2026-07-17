import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetEvaluationStructureEntryForStage = vi.hoisted(() => vi.fn());

vi.mock("../../../src/features/decisionPlugins/evaluations/registry", () => ({
  getEvaluationStructureEntryForStage:
    mockGetEvaluationStructureEntryForStage,
}));

import EvaluationStructureRenderer from "../../../src/features/issueEvaluation/components/EvaluationStructureRenderer.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const FuturePluginView = ({
  evaluationContext,
  evaluationPayload,
  collectivePayload,
  readOnly,
}) => (
  <div>
    <span>Future plugin rendered</span>
    <span>{evaluationContext.marker}</span>
    <span>{evaluationPayload.value}</span>
    <span>{collectivePayload.collective}</span>
    <span>{String(readOnly)}</span>
  </div>
);

describe("EvaluationStructureRenderer registry dispatch", () => {
  beforeEach(() => {
    mockGetEvaluationStructureEntryForStage.mockReset();
  });

  it("renders an arbitrary resolved plugin without a consumer-side structure branch", () => {
    mockGetEvaluationStructureEntryForStage.mockReturnValue({
      key: "futureStructure",
      stage: "alternativeEvaluation",
      View: FuturePluginView,
    });

    renderWithProviders(
      <EvaluationStructureRenderer
        evaluationContext={{ marker: "canonical-context" }}
        stage="alternativeEvaluation"
        structureKey="futureStructure"
        backendPayload={{ value: "individual-payload" }}
        collectivePayload={{ collective: "collective-payload" }}
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
  });

  it("renders nothing when the public registry cannot resolve the structure", () => {
    mockGetEvaluationStructureEntryForStage.mockReturnValue(null);

    const { container } = renderWithProviders(
      <EvaluationStructureRenderer
        evaluationContext={{ marker: "canonical-context" }}
        stage="alternativeEvaluation"
        structureKey="missingStructure"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
