import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../src/components/FuzzyPreviewChart/FuzzyPreviewChart.jsx",
  () => ({
    FuzzyPreviewChart: ({ labels, height }) => (
      <div
        data-testid="fuzzy-preview-chart"
        data-height={JSON.stringify(height)}
        data-labels={labels.map((label) => label.label).join(",")}
        data-values={JSON.stringify(labels.map((label) => label.values))}
      />
    ),
  })
);

import ExpressionDomainPreview from "../../../src/features/createIssue/expressionDomains/components/ExpressionDomainPreview.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("ExpressionDomainPreview", () => {
  it("renders a compact numeric continuous preview without repeated labels", () => {
    renderWithProviders(
      <ExpressionDomainPreview
        domain={{
          typeKey: "numericContinuous",
          definition: { min: 0, max: 5 },
        }}
      />
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("Continuous interval")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Min$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Max$/)).not.toBeInTheDocument();
  });

  it("renders exact numeric discrete summaries without repeated min max or step labels", () => {
    const { rerender } = renderWithProviders(
      <ExpressionDomainPreview
        domain={{
          typeKey: "numericDiscrete",
          definition: { min: 0, max: 4, step: 1 },
        }}
      />
    );

    expect(screen.getByText("0 · 1 · 2 · 3 · 4")).toBeInTheDocument();
    expect(screen.getByText("5 values")).toBeInTheDocument();
    expect(screen.queryByText(/Step/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Min/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Max/)).not.toBeInTheDocument();

    rerender(
      <ExpressionDomainPreview
        domain={{
          typeKey: "numericDiscrete",
          definition: { min: 0, max: 10, step: 1 },
        }}
      />
    );

    expect(screen.getByText("0 · 1 · 2 · … · 8 · 9 · 10")).toBeInTheDocument();
    expect(screen.getByText("11 values")).toBeInTheDocument();
  });

  it("shows preview unavailable for discrete definitions that do not close on the step sequence", () => {
    renderWithProviders(
      <ExpressionDomainPreview
        domain={{
          typeKey: "numericDiscrete",
          definition: { min: 0, max: 1, step: 0.3 },
        }}
      />
    );

    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
  });

  it("renders an ordered linguistic preview with flexible items, dividers, and canonical labels", () => {
    renderWithProviders(
      <ExpressionDomainPreview
        domain={{
          typeKey: "linguisticOrdinal",
          definition: {
            labels: [
              { key: "low", label: "Low", index: 0 },
              { key: "medium", label: "Medium", index: 1 },
              { key: "high", label: "High", index: 2 },
            ],
          },
        }}
      />
    );

    const ordinalPreview = screen.getByTestId("ordered-linguistic-preview");
    expect(ordinalPreview).toHaveAttribute("data-mobile-direction", "column");
    expect(ordinalPreview).toHaveAttribute("data-desktop-direction", "row");
    expect(screen.getAllByTestId("ordered-linguistic-preview-item")).toHaveLength(3);
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("1:")).toBeInTheDocument();
    expect(screen.getByText("2:")).toBeInTheDocument();
    expect(screen.getByText("3:")).toBeInTheDocument();
    expect(screen.getByText("Low").compareDocumentPosition(screen.getByText("Medium")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Medium").compareDocumentPosition(screen.getByText("High")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryAllByText("Low")).toHaveLength(1);
    expect(document.querySelectorAll(".MuiDivider-root").length).toBeGreaterThan(0);
  });

  it("reuses the ordered-label preview for a linguistic 2-tuple definition", () => {
    renderWithProviders(
      <ExpressionDomainPreview
        domain={{
          typeKey: "linguistic2Tuple",
          definition: {
            labelCount: 5,
            labels: [
              { key: "very_low", label: "Very Low", index: 0 },
              { key: "low", label: "Low", index: 1 },
              { key: "medium", label: "Medium", index: 2 },
              { key: "high", label: "High", index: 3 },
              { key: "very_high", label: "Very High", index: 4 },
            ],
          },
        }}
      />
    );

    expect(screen.getByTestId("ordered-linguistic-preview")).toBeInTheDocument();
    expect(screen.getAllByTestId("ordered-linguistic-preview-item")).toHaveLength(5);
    expect(screen.getByText("Very Low")).toBeInTheDocument();
    expect(screen.getByText("Very High")).toBeInTheDocument();
    expect(screen.queryByLabelText(/alpha/i)).not.toBeInTheDocument();
  });

  it("renders the canonical bounded five-label fuzzy scale without chart changes", () => {
    renderWithProviders(
      <ExpressionDomainPreview
        domain={{
          typeKey: "linguisticFuzzy",
          definition: {
            membershipFunction: "triangular",
            labels: [
              { key: "very_low", label: "Very Low", values: [0, 0, 0.25], index: 0 },
              { key: "low", label: "Low", values: [0, 0.25, 0.5], index: 1 },
              { key: "medium", label: "Medium", values: [0.25, 0.5, 0.75], index: 2 },
              { key: "high", label: "High", values: [0.5, 0.75, 1], index: 3 },
              { key: "very_high", label: "Very High", values: [0.75, 1, 1], index: 4 },
            ],
          },
        }}
      />
    );

    expect(screen.getByTestId("fuzzy-preview-chart")).toBeInTheDocument();
    expect(screen.getByTestId("fuzzy-preview-chart")).toHaveAttribute(
      "data-labels",
      "Very Low,Low,Medium,High,Very High"
    );
    expect(screen.getByTestId("fuzzy-preview-chart")).toHaveAttribute(
      "data-values",
      JSON.stringify([
        [0, 0, 0.25],
        [0, 0.25, 0.5],
        [0.25, 0.5, 0.75],
        [0.5, 0.75, 1],
        [0.75, 1, 1],
      ])
    );
    expect(screen.getByTestId("fuzzy-preview-chart")).toHaveAttribute(
      "data-height",
      JSON.stringify({ xs: 192, sm: 204, lg: 216 })
    );
  });
});
