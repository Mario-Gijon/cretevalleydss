import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCreatorDiagnostic = vi.hoisted(() => vi.fn());
const mockExpertDiagnostic = vi.hoisted(() => vi.fn());

vi.mock("../../../../../src/services/issue.service.js", async (importOriginal) => ({
  ...(await importOriginal()),
  diagnoseCreatorAHPConsistency: mockCreatorDiagnostic,
}));

vi.mock("../../../../../src/features/issueEvaluation/services/issueEvaluation.service.js", async (importOriginal) => ({
  ...(await importOriginal()),
  diagnoseExpertAHPConsistency: mockExpertDiagnostic,
}));

import CriteriaPairwiseAHPView from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/CriteriaPairwiseAHPView.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const criteria = [
  { id: "quality", name: "Quality" },
  { id: "cost", name: "Cost" },
  { id: "sustainability", name: "Sustainability" },
];
const decisionContext = { leafCriteria: criteria };
const consistentEvaluation = {
  comparisons: [
    { criterionId: "quality", comparedCriterionId: "cost", value: 2 },
    { criterionId: "quality", comparedCriterionId: "sustainability", value: 6 },
    { criterionId: "cost", comparedCriterionId: "sustainability", value: 3 },
  ],
};
const changedEvaluation = {
  comparisons: [
    { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
    { criterionId: "quality", comparedCriterionId: "sustainability", value: 6 },
    { criterionId: "cost", comparedCriterionId: "sustainability", value: 2 },
  ],
};
const incompleteEvaluation = { comparisons: [] };
const inconsistentEvaluation = {
  comparisons: [
    { criterionId: "quality", comparedCriterionId: "cost", value: 9 },
    { criterionId: "quality", comparedCriterionId: "sustainability", value: 1 },
    { criterionId: "cost", comparedCriterionId: "sustainability", value: 9 },
  ],
};
const creatorContext = {
  mode: "creator",
  criteriaWeightingModelId: "0123456789abcdef01234567",
  criteriaWeightingModelKey: "ahp_criteria_weights",
  criteriaWeightingParameters: {},
};

const diagnostic = (consistencyRatio, overrides = {}) => ({
  expertKey: "user-1",
  expertName: "Expert",
  criterionCount: 3,
  completedComparisons: 3,
  requiredComparisons: 3,
  lambdaMax: 3.1,
  consistencyIndex: 0.05,
  randomIndex: 0.58,
  consistencyRatio,
  consistencyStatus: consistencyRatio > 0.1 ? "review" : "consistent",
  consistencyThreshold: 0.1,
  triads: [],
  candidateComparisons: [],
  recommendations: [],
  criteria,
  ...overrides,
});

const renderView = (props = {}) => renderWithProviders(
  <CriteriaPairwiseAHPView
    decisionContext={decisionContext}
    evaluation={consistentEvaluation}
    setEvaluation={vi.fn()}
    collectiveEvaluation={null}
    readOnly={false}
    diagnosticContext={creatorContext}
    {...props}
  />,
);

const clickCheckCR = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Check CR" }));
    await Promise.resolve();
  });
};

const choosePreference = async (criterionName, comparedCriterionName, optionLabel) => {
  await act(async () => {
    fireEvent.mouseDown(screen.getByRole("combobox", {
      name: `Compare ${criterionName} with ${comparedCriterionName}`,
    }), { button: 0 });
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("option", { name: optionLabel }));
  });
};

describe("manual AHP consistency check", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("never requests automatically when a matrix is completed or a Select changes", async () => {
    const setEvaluation = vi.fn();
    const { rerender } = renderView({ evaluation: incompleteEvaluation, setEvaluation });

    expect(screen.getByText("Complete all pairwise comparisons to check consistency.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check CR" })).toBeDisabled();
    expect(mockCreatorDiagnostic).not.toHaveBeenCalled();

    rerender(
      <CriteriaPairwiseAHPView
        decisionContext={decisionContext}
        evaluation={consistentEvaluation}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
        diagnosticContext={creatorContext}
      />,
    );
    expect(screen.getByText("Consistency has not been checked for the current comparisons.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check CR" })).toBeEnabled();
    expect(mockCreatorDiagnostic).not.toHaveBeenCalled();

    await choosePreference("Quality", "Cost", "4");
    expect(setEvaluation).toHaveBeenCalledWith({
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 4 },
        { criterionId: "quality", comparedCriterionId: "sustainability", value: 6 },
        { criterionId: "cost", comparedCriterionId: "sustainability", value: 3 },
      ],
    });
    rerender(
      <CriteriaPairwiseAHPView
        decisionContext={decisionContext}
        evaluation={{
          comparisons: [
            { criterionId: "quality", comparedCriterionId: "cost", value: 4 },
            { criterionId: "quality", comparedCriterionId: "sustainability", value: 6 },
            { criterionId: "cost", comparedCriterionId: "sustainability", value: 3 },
          ],
        }}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
        diagnosticContext={creatorContext}
      />,
    );
    expect(screen.getByText("Consistency has not been checked for the current comparisons.")).toBeInTheDocument();
    expect(mockCreatorDiagnostic).not.toHaveBeenCalled();
  }, 10000);

  it("checks a complete creator matrix only after Check CR and displays an acceptable CR", async () => {
    mockCreatorDiagnostic.mockResolvedValue({ success: true, data: diagnostic(0) });
    renderView({ evaluation: consistentEvaluation });

    expect(mockCreatorDiagnostic).not.toHaveBeenCalled();
    await clickCheckCR();

    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);
    expect(mockCreatorDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      criteriaWeightingModelId: creatorContext.criteriaWeightingModelId,
      criteria: criteria.map(({ id, name }, index) => ({ id, name, index })),
      evaluation: consistentEvaluation,
      signal: expect.any(AbortSignal),
    }));
    expect(screen.getByText("Consistent")).toBeInTheDocument();
    expect(screen.getByText("CR 0.0000")).toBeInTheDocument();
  });

  it("shows CR not applicable with fewer than three criteria without a button or request", () => {
    const twoCriteria = criteria.slice(0, 2);
    renderView({
      decisionContext: { leafCriteria: twoCriteria },
      evaluation: { comparisons: [{ criterionId: "quality", comparedCriterionId: "cost", value: 3 }] },
    });

    expect(screen.getByText("CR not applicable.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check CR" })).not.toBeInTheDocument();
    expect(mockCreatorDiagnostic).not.toHaveBeenCalled();
  });

  it("shows high-CR explanations, recommendations and both highlights only after checking", async () => {
    const setEvaluation = vi.fn();
    const onConsistencyWarningChange = vi.fn();
    mockCreatorDiagnostic.mockResolvedValue({
      success: true,
      data: diagnostic(0.24, {
        triads: [{
          criteria: criteria.map(({ id, name }) => ({ id, name })),
          comparisons: [
            { fromCriterionId: "quality", toCriterionId: "cost", value: 9 },
            { fromCriterionId: "cost", toCriterionId: "sustainability", value: 9 },
            { fromCriterionId: "quality", toCriterionId: "sustainability", value: 1 },
          ],
          impliedRatio: 81,
          directRatio: 1,
          candidateComparisons: [
            { criterionId: "quality", comparedCriterionId: "cost" },
          ],
        }],
        candidateComparisons: [
          { criterionId: "quality", comparedCriterionId: "cost" },
        ],
        recommendations: [{
          comparison: { criterionId: "quality", comparedCriterionId: "cost" },
          currentValue: 9,
          suggestedValue: 1 / 9,
          originalCR: 0.24,
          counterfactualCR: 0.08,
          improvement: 0.16,
        }],
      }),
    });

    const { container, rerender } = renderView({
      evaluation: inconsistentEvaluation,
      setEvaluation,
      onConsistencyWarningChange,
    });
    expect(screen.queryByText("Review consistency")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-review-candidate="true"]')).toHaveLength(0);

    await clickCheckCR();

    expect(screen.getByText("Review consistency")).toBeInTheDocument();
    expect(screen.getByText("CR 0.2400")).toBeInTheDocument();
    expect(screen.getByText(/Quality was judged 9 times more important than Cost/)).toBeInTheDocument();
    expect(screen.getByText(/implied relationship is outside Saaty/)).toBeInTheDocument();
    expect(screen.getByText(/Quality vs Cost: 9 → 1\/9/)).toBeInTheDocument();
    expect(screen.getByText(/CR 0.2400 → 0.0800/)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-review-candidate="true"]')).toHaveLength(2);
    expect(setEvaluation).not.toHaveBeenCalled();
    expect(screen.getByText(/nothing is changed automatically/)).toBeInTheDocument();
    expect(onConsistencyWarningChange).toHaveBeenLastCalledWith(expect.stringContaining("0.2400"));

    rerender(
      <CriteriaPairwiseAHPView
        decisionContext={decisionContext}
        evaluation={changedEvaluation}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
        diagnosticContext={creatorContext}
        onConsistencyWarningChange={onConsistencyWarningChange}
      />,
    );
    expect(screen.queryByText("Review consistency")).not.toBeInTheDocument();
    expect(screen.getByText("Consistency has not been checked for the current comparisons.")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-review-candidate="true"]')).toHaveLength(0);
    expect(onConsistencyWarningChange).toHaveBeenLastCalledWith(null);
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);
  });

  it("uses the expert endpoint and hides manual checks in readonly mode", async () => {
    mockExpertDiagnostic.mockResolvedValue({ success: true, data: diagnostic(0) });
    const expertProps = {
      diagnosticContext: { mode: "expert", issueId: "issue-22" },
    };
    const expertView = renderView(expertProps);

    expect(mockExpertDiagnostic).not.toHaveBeenCalled();
    await clickCheckCR();

    expect(mockExpertDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      issueId: "issue-22",
      evaluation: consistentEvaluation,
      signal: expect.any(AbortSignal),
    }));
    expect(screen.getByText("Consistent")).toBeInTheDocument();

    expertView.unmount();
    renderView({ ...expertProps, readOnly: true });
    expect(screen.queryByRole("button", { name: "Check CR" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("ahp-consistency-diagnostic")).not.toBeInTheDocument();
    expect(mockExpertDiagnostic).toHaveBeenCalledTimes(1);
  });

  it("invalidates a pending result immediately, including after values are restored", async () => {
    let resolveFirst;
    let firstSignal;
    mockCreatorDiagnostic
      .mockImplementationOnce(({ signal }) => {
        firstSignal = signal;
        return new Promise((resolve) => { resolveFirst = resolve; });
      })
      .mockResolvedValueOnce({ success: true, data: diagnostic(0) });

    const { rerender } = renderView({ evaluation: consistentEvaluation });
    await clickCheckCR();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Checking..." })).toBeDisabled();

    rerender(
      <CriteriaPairwiseAHPView
        decisionContext={decisionContext}
        evaluation={changedEvaluation}
        setEvaluation={vi.fn()}
        collectiveEvaluation={null}
        readOnly={false}
        diagnosticContext={creatorContext}
      />,
    );
    expect(firstSignal.aborted).toBe(true);
    expect(screen.queryByText("Consistent")).not.toBeInTheDocument();
    expect(screen.getByText("Consistency has not been checked for the current comparisons.")).toBeInTheDocument();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst({ success: true, data: diagnostic(0.9) });
      await Promise.resolve();
    });
    expect(screen.queryByText("Review consistency")).not.toBeInTheDocument();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);

    rerender(
      <CriteriaPairwiseAHPView
        decisionContext={decisionContext}
        evaluation={consistentEvaluation}
        setEvaluation={vi.fn()}
        collectiveEvaluation={null}
        readOnly={false}
        diagnosticContext={creatorContext}
      />,
    );
    expect(screen.getByText("Consistency has not been checked for the current comparisons.")).toBeInTheDocument();
    expect(screen.queryByText("Review consistency")).not.toBeInTheDocument();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);

    await clickCheckCR();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Consistent")).toBeInTheDocument();
  });

  it("aborts and ignores a response from an old model or criteria context", async () => {
    let resolveFirst;
    let firstSignal;
    mockCreatorDiagnostic
      .mockImplementationOnce(({ signal }) => {
        firstSignal = signal;
        return new Promise((resolve) => { resolveFirst = resolve; });
      })
      .mockResolvedValueOnce({
        success: true,
        data: diagnostic(0, {
          criteria: [
            { id: "quality", name: "Quality" },
            { id: "cost", name: "Cost" },
            { id: "delivery", name: "Delivery" },
          ],
        }),
      });

    const { rerender } = renderView();
    await clickCheckCR();
    const changedCriteria = [
      { id: "quality", name: "Quality" },
      { id: "cost", name: "Cost" },
      { id: "delivery", name: "Delivery" },
    ];
    const changedEvaluation = {
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 2 },
        { criterionId: "quality", comparedCriterionId: "delivery", value: 6 },
        { criterionId: "cost", comparedCriterionId: "delivery", value: 3 },
      ],
    };
    rerender(
      <CriteriaPairwiseAHPView
        decisionContext={{ leafCriteria: changedCriteria }}
        evaluation={changedEvaluation}
        setEvaluation={vi.fn()}
        collectiveEvaluation={null}
        readOnly={false}
        diagnosticContext={{
          ...creatorContext,
          criteriaWeightingModelId: "abcdefabcdefabcdefabcdef",
        }}
      />,
    );
    expect(firstSignal.aborted).toBe(true);
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Consistency has not been checked for the current comparisons.")).toBeInTheDocument();

    await act(async () => {
      resolveFirst({ success: true, data: diagnostic(0.9) });
      await Promise.resolve();
    });
    expect(screen.queryByText("Review consistency")).not.toBeInTheDocument();

    await clickCheckCR();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(2);
    expect(mockCreatorDiagnostic.mock.calls[1][0]).toMatchObject({
      criteriaWeightingModelId: "abcdefabcdefabcdefabcdef",
      criteria: changedCriteria,
    });
    expect(screen.getByText("Consistent")).toBeInTheDocument();
  });

  it("invalidates an expert diagnostic when the active Issue changes", async () => {
    let resolveFirst;
    let firstSignal;
    mockExpertDiagnostic
      .mockImplementationOnce(({ signal }) => {
        firstSignal = signal;
        return new Promise((resolve) => { resolveFirst = resolve; });
      })
      .mockResolvedValueOnce({ success: true, data: diagnostic(0) });
    const { rerender } = renderView({
      diagnosticContext: { mode: "expert", issueId: "issue-22" },
    });
    await clickCheckCR();
    expect(mockExpertDiagnostic.mock.calls[0][0]).toMatchObject({ issueId: "issue-22" });

    rerender(
      <CriteriaPairwiseAHPView
        decisionContext={decisionContext}
        evaluation={consistentEvaluation}
        setEvaluation={vi.fn()}
        collectiveEvaluation={null}
        readOnly={false}
        diagnosticContext={{ mode: "expert", issueId: "issue-23" }}
      />,
    );
    expect(firstSignal.aborted).toBe(true);
    expect(screen.getByText("Consistency has not been checked for the current comparisons.")).toBeInTheDocument();

    await act(async () => {
      resolveFirst({ success: true, data: diagnostic(0.9) });
      await Promise.resolve();
    });
    expect(screen.queryByText("Review consistency")).not.toBeInTheDocument();
    expect(mockExpertDiagnostic).toHaveBeenCalledTimes(1);

    await clickCheckCR();
    expect(mockExpertDiagnostic).toHaveBeenCalledTimes(2);
    expect(mockExpertDiagnostic.mock.calls[1][0]).toMatchObject({ issueId: "issue-23" });
    expect(screen.getByText("Consistent")).toBeInTheDocument();
  });

  it("allows retry after an unavailable service response", async () => {
    mockCreatorDiagnostic
      .mockResolvedValueOnce({ success: false, status: 503 })
      .mockResolvedValueOnce({ success: true, data: diagnostic(0) });
    renderView();

    await clickCheckCR();
    expect(screen.getByText("Consistency check unavailable. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check CR" })).toBeEnabled();

    await clickCheckCR();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Consistent")).toBeInTheDocument();
  });

  it("reports timeout and cancels an active request on unmount", async () => {
    let signal;
    mockCreatorDiagnostic.mockImplementation(({ signal: requestSignal }) => {
      signal = requestSignal;
      return new Promise((_resolve, reject) => {
        requestSignal.addEventListener("abort", () => {
          reject(new DOMException("Request timed out", "AbortError"));
        });
      });
    });
    const view = renderView();
    await clickCheckCR();
    expect(signal.aborted).toBe(false);
    expect(screen.getByRole("button", { name: "Checking..." })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(signal.aborted).toBe(true);
    expect(screen.getByText("Consistency check unavailable. Please try again.")).toBeInTheDocument();

    view.unmount();
  });
});
