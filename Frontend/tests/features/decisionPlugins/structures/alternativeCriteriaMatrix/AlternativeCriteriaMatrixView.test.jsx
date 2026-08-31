import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AlternativeCriteriaMatrixView from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/AlternativeCriteriaMatrixView.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const numericDomain = {
  typeKey: "numericContinuous",
  definition: {
    min: 0,
    max: 10,
  },
};

const ordinalDomain = {
  typeKey: "linguisticOrdinal",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "high", label: "High", index: 1 },
    ],
  },
};

const fuzzyDomain = {
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labels: [
      { key: "low", label: "Low", values: [0, 0.2, 0.4], index: 0 },
      { key: "high", label: "High", values: [0.6, 0.8, 1], index: 1 },
    ],
  },
};

const linguistic2TupleDomain = {
  typeKey: "linguistic2Tuple",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "high", label: "Medium", index: 1 },
    ],
  },
};

const buildDecisionContext = (criteria = []) => ({
  alternatives: [
    { id: "alt-a", name: "Alternative A" },
    { id: "alt-b", name: "Alternative B" },
  ],
  leafCriteria: criteria,
});

const buildMatrixPayload = () => ({
  "alt-a": {
    "criterion-1": 7.5,
    "criterion-2": { labelKey: "low" },
    "criterion-3": { labelKey: "high" },
  },
  "alt-b": {
    "criterion-1": 6.5,
    "criterion-2": { labelKey: "high" },
    "criterion-3": { labelKey: "low" },
  },
});

describe("AlternativeCriteriaMatrixView", () => {
  it("updates a canonical cell and disables it in read-only mode", () => {
    const setEvaluation = vi.fn();
    const decisionContext = buildDecisionContext([
      { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
    ]);
    const evaluation = {
      "alt-a": { "criterion-1": 7.5 },
      "alt-b": { "criterion-1": 6.5 },
    };

    const { unmount } = renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={decisionContext}
        evaluation={evaluation}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
      />
    );

    fireEvent.change(screen.getAllByRole("spinbutton")[0], {
      target: { value: "8" },
    });
    expect(setEvaluation).toHaveBeenCalledWith({
      "alt-a": { "criterion-1": 8 },
      "alt-b": { "criterion-1": 6.5 },
    });
    unmount();

    renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={decisionContext}
        evaluation={evaluation}
        setEvaluation={vi.fn()}
        collectiveEvaluation={null}
        readOnly
      />
    );

    screen.getAllByRole("spinbutton").forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("renders expression-domain inputs for numeric, ordinal, and fuzzy criteria", () => {
    renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={buildDecisionContext([
          { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
          { id: "criterion-2", name: "Ordinal", expressionDomain: ordinalDomain },
          { id: "criterion-3", name: "Fuzzy", expressionDomain: fuzzyDomain },
        ])}
        evaluation={buildMatrixPayload()}
        setEvaluation={vi.fn()}
        collectiveEvaluation={{
          "alt-a": {
            "criterion-1": 7.2,
            "criterion-2": 0,
            "criterion-3": [0.6, 0.8, 1],
          },
          "alt-b": {
            "criterion-1": 6.2,
            "criterion-2": 1,
            "criterion-3": [0, 0.2, 0.4],
          },
        }}
        readOnly={false}
      />
    );

    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
    expect(screen.getByText("7.2")).toBeInTheDocument();
    expect(screen.getByTitle("High — [0.6, 0.8, 1]")).toBeInTheDocument();
  });

  it("does not show a collective chip or an error for null collectiveEvaluation", () => {
    renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={buildDecisionContext([
          { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
        ])}
        evaluation={{
          "alt-a": {
            "criterion-1": 7.5,
          },
          "alt-b": {
            "criterion-1": 6.5,
          },
        }}
        setEvaluation={vi.fn()}
        collectiveEvaluation={null}
        readOnly={false}
      />
    );

    expect(screen.queryByText("7.2")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("preserves individual and collective numeric values in read-only mode", () => {
    renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={buildDecisionContext([
          { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
        ])}
        evaluation={{
          "alt-a": { "criterion-1": 7.5 },
          "alt-b": { "criterion-1": 6.5 },
        }}
        setEvaluation={vi.fn()}
        collectiveEvaluation={{
          "alt-a": { "criterion-1": 7.2 },
          "alt-b": { "criterion-1": 6.2 },
        }}
        readOnly
      />
    );

    expect(screen.getByDisplayValue("7.5")).toBeDisabled();
    expect(screen.getByText("7.2")).toBeInTheDocument();
  });

  it("renders only a linguistic 2-tuple collective in read-only mode", () => {
    renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={buildDecisionContext([
          { id: "criterion-1", name: "Linguistic", expressionDomain: linguistic2TupleDomain },
        ])}
        evaluation={{
          "alt-a": { "criterion-1": { labelKey: "low", alpha: 0 } },
          "alt-b": { "criterion-1": { labelKey: "high", alpha: 0 } },
        }}
        setEvaluation={vi.fn()}
        collectiveEvaluation={{
          "alt-a": { "criterion-1": { labelKey: "high", alpha: -0.5 } },
          "alt-b": { "criterion-1": { labelKey: "high", alpha: 0 } },
        }}
        readOnly
      />
    );

    expect(screen.getByText("Medium (α = -0.5)")).toBeInTheDocument();
    expect(screen.getByText("Medium (α = 0)")).toBeInTheDocument();
    expect(screen.queryByText("Low")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports an unavailable evaluation payload", () => {
    renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={buildDecisionContext([
          { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
        ])}
        evaluation={undefined}
        setEvaluation={vi.fn()}
        collectiveEvaluation={null}
        readOnly={false}
      />
    );

    expect(screen.getByText("Evaluation payload is invalid.")).toBeInTheDocument();
  });

  it("renders a collective payload alert for invalid present values", () => {
    const criteria = [
      { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
    ];

    for (const collectiveEvaluation of [
      {
        "alt-a": { "criterion-1": "7.2" },
        "alt-b": { "criterion-1": 6.2 },
      },
      {
        "alt-a": { "criterion-1": [] },
        "alt-b": { "criterion-1": 6.2 },
      },
      {
        "alt-a": { "criterion-1": [0.6, "bad"] },
        "alt-b": { "criterion-1": 6.2 },
      },
    ]) {
      const { unmount } = renderWithProviders(
        <AlternativeCriteriaMatrixView
          decisionContext={buildDecisionContext(criteria)}
          evaluation={{
            "alt-a": {
              "criterion-1": 7.5,
            },
            "alt-b": {
              "criterion-1": 6.5,
            },
          }}
          setEvaluation={vi.fn()}
          collectiveEvaluation={collectiveEvaluation}
          readOnly={false}
        />
      );

      expect(screen.getByRole("alert")).toHaveTextContent("Collective payload cell");
      expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("renders a collective payload alert for unknown collective rows and cells", () => {
    const criteria = [
      { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
    ];

    const { unmount } = renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={buildDecisionContext(criteria)}
        evaluation={{
          "alt-a": {
            "criterion-1": 7.5,
          },
          "alt-b": {
            "criterion-1": 6.5,
          },
        }}
        setEvaluation={vi.fn()}
        collectiveEvaluation={{
          "alt-c": {
            "criterion-1": 7.2,
          },
        }}
        readOnly={false}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Collective payload contains unknown alternative rows."
    );
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
    unmount();

    renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={buildDecisionContext(criteria)}
        evaluation={{
          "alt-a": {
            "criterion-1": 7.5,
          },
          "alt-b": {
            "criterion-1": 6.5,
          },
        }}
        setEvaluation={vi.fn()}
        collectiveEvaluation={{
          "alt-a": {
            "criterion-2": 7.2,
          },
        }}
        readOnly={false}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Collective alternative row contains unknown criterion cells."
    );
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });

  it("displays non-matching fuzzy vectors completely and does not nearest-match outside epsilon", () => {
    const criteria = [
      { id: "criterion-1", name: "Fuzzy", expressionDomain: fuzzyDomain },
    ];

    const { unmount } = renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={buildDecisionContext(criteria)}
        evaluation={{
          "alt-a": {
            "criterion-1": { labelKey: "low" },
          },
          "alt-b": {
            "criterion-1": { labelKey: "high" },
          },
        }}
        setEvaluation={vi.fn()}
        collectiveEvaluation={{
          "alt-a": {
            "criterion-1": [0.61, 0.8, 1],
          },
          "alt-b": {
            "criterion-1": [0.6, 0.8, 1],
          },
        }}
        readOnly={false}
      />
    );

    expect(screen.getByText("[0.61, 0.8, 1]")).toBeInTheDocument();
    expect(screen.getByTitle("[0.61, 0.8, 1]")).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <AlternativeCriteriaMatrixView
        decisionContext={buildDecisionContext([
          {
            id: "criterion-1",
            name: "Five-point fuzzy",
            expressionDomain: {
              typeKey: "linguisticFuzzy",
              definition: {
                membershipFunction: "hexagonal",
                labels: [
                  {
                    key: "left",
                    label: "Left",
                    index: 0,
                    values: [0, 0.1, 0.2, 0.3, 0.4],
                  },
                  {
                    key: "right",
                    label: "Right",
                    index: 1,
                    values: [0.6, 0.7, 0.8, 0.9, 1],
                  },
                ],
              },
            },
          },
        ])}
        evaluation={{
          "alt-a": {
            "criterion-1": { labelKey: "left" },
          },
          "alt-b": {
            "criterion-1": { labelKey: "right" },
          },
        }}
        setEvaluation={vi.fn()}
        collectiveEvaluation={{
          "alt-a": {
            "criterion-1": [0.11, 0.22, 0.33, 0.44, 0.55],
          },
          "alt-b": {
            "criterion-1": [0.6, 0.7, 0.8, 0.9, 1],
          },
        }}
        readOnly={false}
      />
    );

    expect(screen.getByText("[0.11, 0.22, 0.33, 0.44, 0.55]")).toBeInTheDocument();
  });
});
