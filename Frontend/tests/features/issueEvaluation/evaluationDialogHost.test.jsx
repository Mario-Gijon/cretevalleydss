import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetEvaluationStructureEntryForStage = vi.hoisted(() => vi.fn());
const mockEvaluationStructureDialog = vi.hoisted(() => vi.fn());

vi.mock(
  "../../../src/features/decisionPlugins/evaluations/evaluationStructureRegistry",
  async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual,
      getEvaluationStructureEntryForStage: mockGetEvaluationStructureEntryForStage,
    };
  }
);

vi.mock(
  "../../../src/features/issueEvaluation/components/EvaluationStructureDialog.jsx",
  () => ({
    default: (props) => {
      mockEvaluationStructureDialog(props);
      return (
        <div data-testid="evaluation-structure-dialog">
          structure:{props.structureKey}
        </div>
      );
    },
  })
);

import EvaluationDialogHost from "../../../src/features/issueEvaluation/components/EvaluationDialogHost.jsx";
import { EVALUATION_STAGES } from "../../../src/features/decisionPlugins/evaluations/evaluationStages.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("EvaluationDialogHost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when issue is missing", () => {
    const { container } = renderWithProviders(
      <EvaluationDialogHost
        issue={null}
        stage={EVALUATION_STAGES.ALTERNATIVE_EVALUATION}
        isOpen
        setIsOpen={vi.fn()}
        setOpenIssueDialog={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when stage is missing", () => {
    const { container } = renderWithProviders(
      <EvaluationDialogHost
        issue={{ id: "issue-1" }}
        stage={null}
        isOpen
        setIsOpen={vi.fn()}
        setOpenIssueDialog={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders unsupported structure details and closes on request", async () => {
    const setIsOpen = vi.fn();
    mockGetEvaluationStructureEntryForStage.mockReturnValue(null);

    renderWithProviders(
      <EvaluationDialogHost
        issue={{
          id: "issue-1",
          criteriaWeightsStructureKey: "unknownWeights",
        }}
        stage={EVALUATION_STAGES.CRITERIA_WEIGHTING}
        isOpen
        setIsOpen={setIsOpen}
        setOpenIssueDialog={vi.fn()}
      />
    );

    expect(screen.getByText("Unsupported evaluation structure")).toBeInTheDocument();
    expect(screen.getByText("Stage: criteriaWeighting")).toBeInTheDocument();
    expect(screen.getByText("Structure key: unknownWeights")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("renders EvaluationStructureDialog for supported structures with the expected props", () => {
    const setIsOpen = vi.fn();
    const setOpenIssueDialog = vi.fn();
    const issue = {
      id: "issue-1",
      evaluationStructureKey: "alternativeCriteriaMatrix",
    };
    mockGetEvaluationStructureEntryForStage.mockReturnValue({
      key: "alternativeCriteriaMatrix",
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      View: () => null,
    });

    renderWithProviders(
      <EvaluationDialogHost
        issue={issue}
        stage={EVALUATION_STAGES.ALTERNATIVE_EVALUATION}
        isOpen
        setIsOpen={setIsOpen}
        setOpenIssueDialog={setOpenIssueDialog}
      />
    );

    expect(screen.getByTestId("evaluation-structure-dialog")).toBeInTheDocument();
    expect(mockEvaluationStructureDialog).toHaveBeenCalled();
    expect(mockEvaluationStructureDialog.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        issue,
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        structureKey: "alternativeCriteriaMatrix",
        isOpen: true,
        setIsOpen,
        setOpenIssueDialog,
      })
    );
  });
});
