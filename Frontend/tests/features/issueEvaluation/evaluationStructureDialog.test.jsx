import { forwardRef, useImperativeHandle } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSnackbarAlertContext = vi.hoisted(() => vi.fn());
const mockUseIssuesDataContext = vi.hoisted(() => vi.fn());
const mockGetEvaluationStructureEntryForStage = vi.hoisted(() => vi.fn());
const mockFetchIssueEvaluation = vi.hoisted(() => vi.fn());
const mockSaveIssueEvaluation = vi.hoisted(() => vi.fn());
const mockSubmitIssueEvaluationPayload = vi.hoisted(() => vi.fn());
const mockViewState = vi.hoisted(() => ({
  prepareMode: null,
  nextPayload: undefined,
  lastProps: null,
}));

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

vi.mock("../../../src/context/issues/issues.context", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useIssuesDataContext: mockUseIssuesDataContext,
  };
});

const MockEvaluationView = forwardRef((props, ref) => {
  mockViewState.lastProps = props;

  useImperativeHandle(
    ref,
    () => ({
      preparePayloadRead:
        mockViewState.prepareMode === "prepare"
          ? async () => {
            if (mockViewState.nextPayload !== undefined) {
              props.setEvaluationPayload(mockViewState.nextPayload);
            }
          }
          : undefined,
      flushPendingEdits:
        mockViewState.prepareMode === "flush"
          ? async () => {
            if (mockViewState.nextPayload !== undefined) {
              props.setEvaluationPayload(mockViewState.nextPayload);
            }
          }
          : undefined,
    }),
    [props]
  );

  return (
    <div>
      <div data-testid="view-context-id">{props.evaluationContext?.issue?.id || ""}</div>
      <div data-testid="view-payload">{JSON.stringify(props.evaluationPayload)}</div>
      <div data-testid="view-collective">
        {props.collectivePayload ? JSON.stringify(props.collectivePayload) : "null"}
      </div>
      <div data-testid="view-readonly">{String(props.readOnly)}</div>
      <button onClick={() => props.setEvaluationPayload({ changed: true })}>
        mark-dirty
      </button>
    </div>
  );
});
MockEvaluationView.displayName = "MockEvaluationView";

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

vi.mock("../../../src/features/issueEvaluation/services/issueEvaluation.service", () => ({
  fetchIssueEvaluation: mockFetchIssueEvaluation,
  saveIssueEvaluation: mockSaveIssueEvaluation,
  submitIssueEvaluationPayload: mockSubmitIssueEvaluationPayload,
}));

vi.mock(
  "../../../src/features/issueEvaluation/components/AlternativeEvaluationDialogShell.jsx",
  () => ({
    default: ({
      open,
      onClose,
      loading,
      title,
      subtitle,
      children,
      actions,
      showCollectiveControl,
      collectiveVisible,
      onToggleCollective,
    }) =>
      open ? (
        <div data-testid="dialog-shell">
          <div data-testid="shell-loading">{String(loading)}</div>
          <div>{title}</div>
          <div>{subtitle}</div>
          {showCollectiveControl ? (
            <button onClick={() => onToggleCollective?.()}>
              {collectiveVisible ? "Hide collective" : "Show collective"}
            </button>
          ) : null}
          <button onClick={() => onClose?.()}>request-close</button>
          <button onClick={() => onClose?.()}>close-icon</button>
          <button onClick={() => {}}>noop</button>
          <div>{children}</div>
          <div>{actions}</div>
        </div>
      ) : null,
  })
);

vi.mock(
  "../../../src/features/issueEvaluation/components/AlternativeEvaluationSaveDialog.jsx",
  () => ({
    default: ({ open, onClose, onSave, onExit }) =>
      open ? (
        <div>
          <div>Save changes?</div>
          <button onClick={() => onClose?.()}>cancel-save-dialog</button>
          <button onClick={() => onExit?.()}>Exit</button>
          <button onClick={() => onSave?.()}>Save draft</button>
        </div>
      ) : null,
  })
);

vi.mock(
  "../../../src/features/issueEvaluation/components/AlternativeEvaluationSubmitDialog.jsx",
  () => ({
    default: ({ open, onClose, onSubmit }) =>
      open ? (
        <div>
          <div>Submit evaluations?</div>
          <button onClick={() => onClose?.()}>Cancel</button>
          <button onClick={() => onSubmit?.()}>Submit</button>
        </div>
      ) : null,
  })
);

import EvaluationStructureDialog from "../../../src/features/issueEvaluation/components/EvaluationStructureDialog.jsx";
import { EVALUATION_STAGES } from "../../../src/features/decisionPlugins/evaluations/evaluationStages.js";
import {
  evaluationIssueFixture,
  evaluationIssueWithUnderscoreIdFixture,
  evaluationResponseFixture,
} from "../../mocks/fixtures/evaluation.fixtures.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("EvaluationStructureDialog", () => {
  const showSnackbarAlert = vi.fn();
  const fetchActiveIssues = vi.fn().mockResolvedValue(undefined);
  const setIsOpen = vi.fn();
  const setOpenIssueDialog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockViewState.prepareMode = null;
    mockViewState.nextPayload = undefined;
    mockViewState.lastProps = null;
    mockUseSnackbarAlertContext.mockReturnValue({ showSnackbarAlert });
    mockUseIssuesDataContext.mockReturnValue({ fetchActiveIssues });
    mockGetEvaluationStructureEntryForStage.mockReturnValue({
      key: "alternativeCriteriaMatrix",
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      View: MockEvaluationView,
    });
    mockFetchIssueEvaluation.mockResolvedValue(evaluationResponseFixture);
  });

  const renderDialog = (props = {}) =>
    renderWithProviders(
      <EvaluationStructureDialog
        issue={evaluationIssueFixture}
        stage={EVALUATION_STAGES.ALTERNATIVE_EVALUATION}
        structureKey="alternativeCriteriaMatrix"
        isOpen
        setIsOpen={setIsOpen}
        setOpenIssueDialog={setOpenIssueDialog}
        {...props}
      />
    );

  it("loads evaluation data when opened with issue.id and renders the registered view", async () => {
    renderDialog();

    expect(screen.getByTestId("shell-loading")).toHaveTextContent("true");

    await waitFor(() => {
      expect(mockFetchIssueEvaluation).toHaveBeenCalledWith(
        "issue-eval-1",
        EVALUATION_STAGES.ALTERNATIVE_EVALUATION
      );
    });

    expect(screen.getByText("Alternative evaluation")).toBeInTheDocument();
    expect(screen.getByText("Budget Planning")).toBeInTheDocument();
    expect(mockViewState.lastProps).toMatchObject({
      evaluationContext: evaluationResponseFixture.data.evaluationContext,
      evaluationPayload: evaluationResponseFixture.data.payload,
      collectivePayload: evaluationResponseFixture.data.collectiveReference.collectiveEvaluations,
      readOnly: false,
    });
    expect(screen.getByTestId("view-readonly")).toHaveTextContent("false");
  });

  it("loads evaluation data when only issue._id is present", async () => {
    renderDialog({
      issue: evaluationIssueWithUnderscoreIdFixture,
    });

    await waitFor(() => {
      expect(mockFetchIssueEvaluation).toHaveBeenCalledWith(
        "issue-eval-underscore",
        EVALUATION_STAGES.ALTERNATIVE_EVALUATION
      );
    });
  });

  it("shows and toggles collective payload visibility when collective reference exists", async () => {
    renderDialog();

    await screen.findByText("Hide collective");
    expect(screen.getByTestId("view-collective")).toHaveTextContent('{"shared":true}');

    await userEvent.click(screen.getByRole("button", { name: "Hide collective" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Show collective" })).toBeInTheDocument();
      expect(screen.getByTestId("view-collective")).toHaveTextContent("null");
    });
  });

  it("falls back to local context and resets payload when the backend omits evaluationContext", async () => {
    mockFetchIssueEvaluation.mockResolvedValue({
      success: true,
      data: {
        payload: { stale: true },
      },
    });

    renderDialog({
      stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      structureKey: "manualCriteriaWeights",
    });

    await waitFor(() => {
      expect(showSnackbarAlert).toHaveBeenCalledWith(
        "Could not load evaluation context for this evaluation.",
        "error"
      );
    });

    expect(screen.getByTestId("view-payload")).toHaveTextContent("{}");
    expect(mockViewState.lastProps.evaluationContext.issue.id).toBe("issue-eval-1");
    expect(mockViewState.lastProps.evaluationContext.leafCriteria).toHaveLength(2);
  });

  it("falls back to local context when the service rejects and clears loading", async () => {
    mockFetchIssueEvaluation.mockRejectedValue(new Error("network"));

    renderDialog();

    await waitFor(() => {
      expect(showSnackbarAlert).toHaveBeenCalledWith(
        "Could not load evaluation context for this evaluation.",
        "error"
      );
      expect(screen.getByTestId("shell-loading")).toHaveTextContent("false");
    });

    expect(mockViewState.lastProps.evaluationContext.issue.id).toBe("issue-eval-1");
    expect(screen.getByTestId("view-payload")).toHaveTextContent("{}");
  });

  it("closes directly when the payload is unchanged", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchIssueEvaluation).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "request-close" }));

    await waitFor(() => {
      expect(setIsOpen).toHaveBeenCalledWith(false);
    });
  });

  it("flushes pending edits before dirty-close detection and opens the save dialog", async () => {
    mockViewState.prepareMode = "prepare";
    mockViewState.nextPayload = { prepared: true };

    renderDialog();
    await waitFor(() => expect(mockFetchIssueEvaluation).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "request-close" }));

    expect(await screen.findByText("Save changes?")).toBeInTheDocument();
    expect(setIsOpen).not.toHaveBeenCalled();
  });

  it("saves the draft after flushing pending edits and closes on success", async () => {
    mockViewState.prepareMode = "prepare";
    mockViewState.nextPayload = { prepared: true };
    mockSaveIssueEvaluation.mockResolvedValue({
      success: true,
      message: "Draft saved.",
    });

    renderDialog();
    await waitFor(() => expect(mockFetchIssueEvaluation).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "mark-dirty" }));
    await userEvent.click(screen.getByRole("button", { name: "request-close" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(mockSaveIssueEvaluation).toHaveBeenCalledWith(
        "issue-eval-1",
        EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        { prepared: true }
      );
      expect(showSnackbarAlert).toHaveBeenCalledWith("Draft saved.", "success");
      expect(setIsOpen).toHaveBeenCalledWith(false);
    });
  });

  it("keeps the dialog safe on save error and resets loading", async () => {
    mockSaveIssueEvaluation.mockResolvedValue({
      success: false,
      message: "Save failed.",
    });

    renderDialog();
    await waitFor(() => expect(mockFetchIssueEvaluation).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "mark-dirty" }));
    await userEvent.click(screen.getByRole("button", { name: "request-close" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(showSnackbarAlert).toHaveBeenCalledWith("Save failed.", "error");
      expect(screen.getByTestId("shell-loading")).toHaveTextContent("false");
    });
    expect(setIsOpen).not.toHaveBeenCalled();
  });

  it("exits without saving when requested from the save dialog", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchIssueEvaluation).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "mark-dirty" }));
    await userEvent.click(screen.getByRole("button", { name: "request-close" }));
    await userEvent.click(await screen.findByRole("button", { name: "Exit" }));

    expect(mockSaveIssueEvaluation).not.toHaveBeenCalled();
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("opens submit confirmation and submits flushed payload on success", async () => {
    mockViewState.prepareMode = "flush";
    mockViewState.nextPayload = { submitted: true };
    mockSubmitIssueEvaluationPayload.mockResolvedValue({
      success: true,
      message: "Submitted.",
    });

    renderDialog();
    await waitFor(() => expect(mockFetchIssueEvaluation).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Submit evaluations?");
    await userEvent.click(screen.getAllByRole("button", { name: "Submit" })[1]);

    await waitFor(() => {
      expect(mockSubmitIssueEvaluationPayload).toHaveBeenCalledWith(
        "issue-eval-1",
        EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        { submitted: true }
      );
      expect(showSnackbarAlert).toHaveBeenCalledWith("Submitted.", "success");
      expect(fetchActiveIssues).toHaveBeenCalledTimes(1);
      expect(setOpenIssueDialog).toHaveBeenCalledWith(false);
      expect(setIsOpen).toHaveBeenCalledWith(false);
    });
  });

  it("shows submit errors without closing the dialogs", async () => {
    mockSubmitIssueEvaluationPayload.mockResolvedValue({
      success: false,
      message: "Submit failed.",
    });

    renderDialog();
    await waitFor(() => expect(mockFetchIssueEvaluation).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Submit evaluations?");
    await userEvent.click(screen.getAllByRole("button", { name: "Submit" })[1]);

    await waitFor(() => {
      expect(showSnackbarAlert).toHaveBeenCalledWith("Submit failed.", "error");
      expect(screen.getByTestId("shell-loading")).toHaveTextContent("false");
    });
    expect(setIsOpen).not.toHaveBeenCalled();
    expect(setOpenIssueDialog).not.toHaveBeenCalled();
  });

  it("clears all payload data and marks the dialog dirty against a non-empty snapshot", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchIssueEvaluation).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(showSnackbarAlert).toHaveBeenCalledWith("All evaluations cleared", "success");
    expect(screen.getByTestId("view-payload")).toHaveTextContent("{}");

    await userEvent.click(screen.getByRole("button", { name: "request-close" }));

    expect(await screen.findByText("Save changes?")).toBeInTheDocument();
  });
});
