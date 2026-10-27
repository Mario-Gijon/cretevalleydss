import { act, fireEvent, screen, within } from "@testing-library/react";
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
    expect(screen.getByText("Your comparisons are consistent. No major contradictions were found.")).toBeInTheDocument();
    expect(screen.getByText(/CR 0\.0000 · recommended threshold 0\.1000/)).toBeInTheDocument();
  });

  it("shows CR not applicable with fewer than three criteria without a button or request", () => {
    const twoCriteria = criteria.slice(0, 2);
    renderView({
      decisionContext: { leafCriteria: twoCriteria },
      evaluation: { comparisons: [{ criterionId: "quality", comparedCriterionId: "cost", value: 3 }] },
    });

    expect(screen.getByText("CR is not applicable with fewer than three criteria.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check CR" })).not.toBeInTheDocument();
    expect(mockCreatorDiagnostic).not.toHaveBeenCalled();
  });

  it("shows a plain-language diagnosis and DMS suggestions only after checking", async () => {
    vi.useRealTimers();
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
          cycleRatio: 81,
          multiplicativeDiscrepancy: Math.log(81),
          candidateComparisons: [
            { criterionId: "quality", comparedCriterionId: "cost" },
          ],
        }],
        candidateComparisons: [
          { criterionId: "quality", comparedCriterionId: "cost" },
        ],
        recommendations: [
          {
            comparison: { criterionId: "quality", comparedCriterionId: "cost" },
            currentValue: 9,
            suggestedValue: 1 / 9,
            originalCR: 0.24,
            counterfactualCR: 0.08,
            improvement: 0.16,
          },
          {
            comparison: { criterionId: "cost", comparedCriterionId: "quality" },
            currentValue: 9,
            suggestedValue: 3,
            originalCR: 0.24,
            counterfactualCR: 0.1,
            improvement: 0.14,
          },
          {
            comparison: { criterionId: "cost", comparedCriterionId: "sustainability" },
            currentValue: 9,
            suggestedValue: 7,
            originalCR: 0.24,
            counterfactualCR: 0.12,
            improvement: 0.12,
          },
        ],
      }),
    });

    const { container, rerender } = renderView({
      evaluation: inconsistentEvaluation,
      setEvaluation,
      onConsistencyWarningChange,
    });
    expect(screen.queryByText("Your comparisons are not very consistent.")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-review-candidate="true"]')).toHaveLength(0);

    await clickCheckCR();

    expect(screen.getByText("Your comparisons are not very consistent.")).toBeInTheDocument();
    expect(screen.getByText(/CR 0\.2400 · recommended threshold 0\.1000/)).toBeInTheDocument();
    expect(screen.getByText(/Some of your judgments seem to contradict each other/)).toBeInTheDocument();
    expect(screen.getByText("Why does this happen?")).toBeInTheDocument();
    expect(screen.getByTestId("ahp-diagnostic-triad")).toHaveTextContent(
      "You rated Quality as more important than Cost, and Cost as more important than Sustainability.",
    );
    expect(screen.getByTestId("ahp-diagnostic-triad")).toHaveTextContent("beyond the available comparison scale");
    expect(screen.getByText("What can I do?")).toBeInTheDocument();
    expect(screen.getByText(/consistency ratio would decrease from 0\.2400 to 0\.0800/)).toBeInTheDocument();
    expect(screen.getByText(/It would still be above 0\.1000/)).toBeInTheDocument();
    expect(screen.getAllByTestId("ahp-diagnostic-recommendation")).toHaveLength(2);
    within(screen.getAllByTestId("ahp-diagnostic-recommendation")[0])
      .getByText(/This would reverse a strong preference/);
    expect(container.querySelectorAll('[data-review-candidate="true"]')).toHaveLength(6);
    expect(screen.getByTestId("ahp-diagnostic-triad")).not.toHaveTextContent(/cycles|implied relationship|mathematical simulations/i);
    expect(screen.getByRole("button", { name: "Advanced details" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/CI 0\.0500 · λmax 3\.1000/)).not.toBeVisible();
    expect(setEvaluation).not.toHaveBeenCalled();
    expect(screen.getByText(/You do not have to change any answer; nothing is changed automatically/)).toBeInTheDocument();
    expect(onConsistencyWarningChange).toHaveBeenLastCalledWith(expect.stringContaining("0.2400"));

    fireEvent.click(screen.getByRole("button", { name: "Advanced details" }));
    expect(screen.getByText(/CI 0\.0500 · λmax 3\.1000/)).toBeVisible();
    expect(screen.getAllByTestId("ahp-advanced-recommendation")).toHaveLength(3);

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
    expect(screen.queryByText("Your comparisons are not very consistent.")).not.toBeInTheDocument();
    expect(screen.getByText("Consistency has not been checked for the current comparisons.")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-review-candidate="true"]')).toHaveLength(0);
    expect(onConsistencyWarningChange).toHaveBeenLastCalledWith(null);
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);
  }, 10000);

  it("shows only the first contradiction and changes reciprocal cell highlights when another is selected", async () => {
    vi.useRealTimers();
    const fourCriteria = [
      { id: "quality", name: "Quality" },
      { id: "cost", name: "Cost" },
      { id: "sustainability", name: "Sustainability" },
      { id: "delivery", name: "Delivery" },
    ];
    const fourCriterionEvaluation = {
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 2 },
        { criterionId: "quality", comparedCriterionId: "sustainability", value: 3 },
        { criterionId: "quality", comparedCriterionId: "delivery", value: 4 },
        { criterionId: "cost", comparedCriterionId: "sustainability", value: 2 },
        { criterionId: "cost", comparedCriterionId: "delivery", value: 2 },
        { criterionId: "sustainability", comparedCriterionId: "delivery", value: 2 },
      ],
    };
    const firstTriad = {
      criteria: fourCriteria.slice(0, 3),
      comparisons: [
        { fromCriterionId: "quality", toCriterionId: "cost", value: 9 },
        { fromCriterionId: "cost", toCriterionId: "sustainability", value: 9 },
        { fromCriterionId: "quality", toCriterionId: "sustainability", value: 1 },
      ],
      impliedRatio: 81,
      directRatio: 1,
      cycleRatio: 81,
      multiplicativeDiscrepancy: Math.log(81),
    };
    const secondTriad = {
      criteria: [fourCriteria[0], fourCriteria[1], fourCriteria[3]],
      comparisons: [
        { fromCriterionId: "quality", toCriterionId: "cost", value: 1 / 3 },
        { fromCriterionId: "cost", toCriterionId: "delivery", value: 1 / 5 },
        { fromCriterionId: "quality", toCriterionId: "delivery", value: 3 },
      ],
      impliedRatio: 1 / 15,
      directRatio: 3,
      cycleRatio: 1 / 45,
      multiplicativeDiscrepancy: Math.log(45),
    };
    mockCreatorDiagnostic.mockResolvedValue({
      success: true,
      data: diagnostic(0.35, {
        criteria: fourCriteria,
        triads: [firstTriad, secondTriad],
      }),
    });
    const { container } = renderView({
      decisionContext: { leafCriteria: fourCriteria },
      evaluation: fourCriterionEvaluation,
    });

    await clickCheckCR();
    expect(screen.getByTestId("ahp-diagnostic-triad")).toHaveTextContent("Quality as more important than Cost");

    const highlightedLabels = () => [
      ...container.querySelectorAll('[data-review-candidate="true"] [role="combobox"]'),
    ].map((input) => input.getAttribute("aria-label")).sort();
    expect(highlightedLabels()).toEqual([
      "Compare Cost with Quality",
      "Compare Cost with Sustainability",
      "Compare Quality with Cost",
      "Compare Quality with Sustainability",
      "Compare Sustainability with Cost",
      "Compare Sustainability with Quality",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "See other comparisons to review" }));
    fireEvent.click(screen.getByRole("button", { name: "Review comparisons involving Quality · Cost · Delivery" }));

    expect(screen.getByTestId("ahp-diagnostic-triad")).toHaveTextContent("Cost as more important than Quality");
    expect(screen.getByTestId("ahp-diagnostic-triad")).toHaveTextContent("Delivery as more important than Cost");
    expect(highlightedLabels()).toEqual([
      "Compare Cost with Delivery",
      "Compare Cost with Quality",
      "Compare Delivery with Cost",
      "Compare Delivery with Quality",
      "Compare Quality with Cost",
      "Compare Quality with Delivery",
    ]);
  }, 10000);

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
    expect(screen.getByText("Your comparisons are consistent. No major contradictions were found.")).toBeInTheDocument();

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
    expect(screen.queryByText("Your comparisons are consistent. No major contradictions were found.")).not.toBeInTheDocument();
    expect(screen.getByText("Consistency has not been checked for the current comparisons.")).toBeInTheDocument();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst({ success: true, data: diagnostic(0.9) });
      await Promise.resolve();
    });
    expect(screen.queryByText("Your comparisons are not very consistent.")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Your comparisons are not very consistent.")).not.toBeInTheDocument();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);

    await clickCheckCR();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Your comparisons are consistent. No major contradictions were found.")).toBeInTheDocument();
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
    expect(screen.queryByText("Your comparisons are not very consistent.")).not.toBeInTheDocument();

    await clickCheckCR();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(2);
    expect(mockCreatorDiagnostic.mock.calls[1][0]).toMatchObject({
      criteriaWeightingModelId: "abcdefabcdefabcdefabcdef",
      criteria: changedCriteria,
    });
    expect(screen.getByText("Your comparisons are consistent. No major contradictions were found.")).toBeInTheDocument();
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
    expect(screen.queryByText("Your comparisons are not very consistent.")).not.toBeInTheDocument();
    expect(mockExpertDiagnostic).toHaveBeenCalledTimes(1);

    await clickCheckCR();
    expect(mockExpertDiagnostic).toHaveBeenCalledTimes(2);
    expect(mockExpertDiagnostic.mock.calls[1][0]).toMatchObject({ issueId: "issue-23" });
    expect(screen.getByText("Your comparisons are consistent. No major contradictions were found.")).toBeInTheDocument();
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
    expect(screen.getByText("Your comparisons are consistent. No major contradictions were found.")).toBeInTheDocument();
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
