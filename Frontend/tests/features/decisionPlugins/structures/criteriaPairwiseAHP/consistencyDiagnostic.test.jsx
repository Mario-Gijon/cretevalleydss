import { act, screen } from "@testing-library/react";
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

const advanceDiagnosticDebounce = async (milliseconds = 300) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
};

describe("CriteriaPairwiseAHP consistency preview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("does not request an incomplete matrix and debounces a complete creator matrix", async () => {
    mockCreatorDiagnostic.mockResolvedValue({ success: true, data: diagnostic(0) });
    const { rerender } = renderView({ evaluation: { comparisons: [] } });

    expect(screen.getByText("Complete all valid pairwise comparisons to check consistency.")).toBeInTheDocument();
    await advanceDiagnosticDebounce(300);
    expect(mockCreatorDiagnostic).not.toHaveBeenCalled();

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
    await advanceDiagnosticDebounce(299);
    expect(mockCreatorDiagnostic).not.toHaveBeenCalled();
    await advanceDiagnosticDebounce(1);
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);
    expect(mockCreatorDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      criteria: criteria.map(({ id, name }, index) => ({ id, name, index })),
      evaluation: consistentEvaluation,
      signal: expect.any(AbortSignal),
    }));
    expect(screen.getByText("Consistent")).toBeInTheDocument();
    expect(screen.getByText("CR 0.0000")).toBeInTheDocument();
  });

  it("shows non-applicable for fewer than three criteria without requesting a diagnostic", async () => {
    const twoCriteria = criteria.slice(0, 2);
    renderView({
      decisionContext: { leafCriteria: twoCriteria },
      evaluation: { comparisons: [{ criterionId: "quality", comparedCriterionId: "cost", value: 3 }] },
    });

    expect(screen.getByText("A consistency ratio is not calculated with fewer than three criteria.")).toBeInTheDocument();
    await advanceDiagnosticDebounce(1000);
    expect(mockCreatorDiagnostic).not.toHaveBeenCalled();
  });

  it("shows high-CR explanations and recommendations, highlights both orientations, and never mutates judgments", async () => {
    const setEvaluation = vi.fn();
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

    const { container } = renderView({ evaluation: inconsistentEvaluation, setEvaluation });
    await advanceDiagnosticDebounce();

    expect(screen.getByText("Review consistency")).toBeInTheDocument();
    expect(screen.getByText("CR 0.2400")).toBeInTheDocument();
    expect(screen.getByText(/Quality was judged 9 times more important than Cost/)).toBeInTheDocument();
    expect(screen.getByText(/implied relationship is outside Saaty/)).toBeInTheDocument();
    expect(screen.getByText(/Quality vs Cost: 9 → 1\/9/)).toBeInTheDocument();
    expect(screen.getByText(/CR 0.2400 → 0.0800/)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-review-candidate="true"]')).toHaveLength(2);
    expect(setEvaluation).not.toHaveBeenCalled();
    expect(screen.getByText(/nothing is changed automatically/)).toBeInTheDocument();
  });

  it("does not highlight local cycles when the global CR is acceptable", async () => {
    mockCreatorDiagnostic.mockResolvedValue({
      success: true,
      data: diagnostic(0.1, {
        candidateComparisons: [{ criterionId: "quality", comparedCriterionId: "cost" }],
      }),
    });
    const { container } = renderView();
    await advanceDiagnosticDebounce();

    expect(screen.getByText("Consistent")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-review-candidate="true"]')).toHaveLength(0);
  });

  it("uses the expert route with only the issue and local evaluation and does not query in readonly mode", async () => {
    mockExpertDiagnostic.mockResolvedValue({ success: true, data: diagnostic(0) });
    const props = {
      diagnosticContext: { mode: "expert", issueId: "issue-22" },
    };
    const expertView = renderView(props);
    await advanceDiagnosticDebounce();

    expect(mockExpertDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      issueId: "issue-22",
      evaluation: consistentEvaluation,
      signal: expect.any(AbortSignal),
    }));
    expect(screen.getByText("Consistent")).toBeInTheDocument();

    mockExpertDiagnostic.mockClear();
    expertView.unmount();
    renderView({ ...props, readOnly: true });
    await advanceDiagnosticDebounce(1000);
    expect(mockExpertDiagnostic).not.toHaveBeenCalled();
    expect(screen.queryByTestId("ahp-consistency-diagnostic")).not.toBeInTheDocument();
  });

  it("invalidates pending results on evaluation change and ignores a late cancelled response", async () => {
    let resolveFirst;
    let firstSignal;
    mockCreatorDiagnostic
      .mockImplementationOnce(({ signal }) => {
        firstSignal = signal;
        return new Promise((resolve) => { resolveFirst = resolve; });
      })
      .mockResolvedValueOnce({ success: true, data: diagnostic(0) });

    const { rerender } = renderView({ evaluation: consistentEvaluation });
    await advanceDiagnosticDebounce();
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(1);

    const nextEvaluation = {
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
        { criterionId: "quality", comparedCriterionId: "sustainability", value: 6 },
        { criterionId: "cost", comparedCriterionId: "sustainability", value: 2 },
      ],
    };
    rerender(
      <CriteriaPairwiseAHPView
        decisionContext={decisionContext}
        evaluation={nextEvaluation}
        setEvaluation={vi.fn()}
        collectiveEvaluation={null}
        readOnly={false}
        diagnosticContext={creatorContext}
      />,
    );
    expect(firstSignal.aborted).toBe(true);
    expect(screen.queryByText("Consistent")).not.toBeInTheDocument();

    await advanceDiagnosticDebounce();
    await act(async () => {
      resolveFirst({ success: true, data: diagnostic(0.9) });
      await Promise.resolve();
    });
    expect(screen.queryByText("Review consistency")).not.toBeInTheDocument();
    expect(screen.getByText("Consistent")).toBeInTheDocument();
  });

  it("invalidates requests when the selected model or criterion IDs change", async () => {
    let firstSignal;
    let resolveFirst;
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
    await advanceDiagnosticDebounce();

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
    await advanceDiagnosticDebounce();
    await act(async () => {
      resolveFirst({ success: true, data: diagnostic(0.9) });
      await Promise.resolve();
    });
    expect(mockCreatorDiagnostic).toHaveBeenCalledTimes(2);
    expect(mockCreatorDiagnostic.mock.calls[1][0]).toMatchObject({
      criteriaWeightingModelId: "abcdefabcdefabcdefabcdef",
      criteria: changedCriteria,
    });
    expect(screen.getByText("Consistent")).toBeInTheDocument();
  });

  it("reports timeout as an unavailable preview and aborts without blocking the matrix", async () => {
    let signal;
    mockCreatorDiagnostic.mockImplementation(({ signal: requestSignal }) => {
      signal = requestSignal;
      return new Promise((_resolve, reject) => {
        requestSignal.addEventListener("abort", () => {
          reject(new DOMException("Request timed out", "AbortError"));
        });
      });
    });
    renderView();
    await advanceDiagnosticDebounce();
    await advanceDiagnosticDebounce(15000);

    expect(signal.aborted).toBe(true);
    expect(screen.getByText("The consistency check took too long. You can continue without it.")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(6);
  });

  it("cancels an active request when the AHP view unmounts", async () => {
    let signal;
    mockCreatorDiagnostic.mockImplementation(({ signal: requestSignal }) => {
      signal = requestSignal;
      return new Promise(() => {});
    });
    const view = renderView();
    await advanceDiagnosticDebounce();
    expect(signal.aborted).toBe(false);
    view.unmount();
    expect(signal.aborted).toBe(true);
  });

  it("reports a service failure without blocking editing", async () => {
    mockCreatorDiagnostic.mockResolvedValue({ success: false, status: 503 });
    const setEvaluation = vi.fn();
    renderView({ setEvaluation });
    await advanceDiagnosticDebounce();

    expect(screen.getByText("Consistency could not be checked right now. You can continue without it.")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(6);
  });
});
