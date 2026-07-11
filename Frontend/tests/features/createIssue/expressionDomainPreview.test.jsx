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

  it("renders ordinal positions without linguistic label names", () => {
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

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByText("Low")).not.toBeInTheDocument();
    expect(screen.queryByText("Medium")).not.toBeInTheDocument();
    expect(screen.queryByText("High")).not.toBeInTheDocument();
  });

  it("renders the fuzzy chart with all labels and bounded manage height", () => {
    renderWithProviders(
      <ExpressionDomainPreview
        domain={{
          typeKey: "linguisticFuzzy",
          definition: {
            membershipFunction: "triangular",
            labels: [
              { key: "low", label: "Low", values: [0, 0, 0.5], index: 0 },
              { key: "medium", label: "Medium", values: [0, 0.5, 1], index: 1 },
              { key: "high", label: "High", values: [0.5, 1, 1], index: 2 },
            ],
          },
        }}
      />
    );

    expect(screen.getByTestId("fuzzy-preview-chart")).toBeInTheDocument();
    expect(screen.getByTestId("fuzzy-preview-chart")).toHaveAttribute(
      "data-labels",
      "Low,Medium,High"
    );
    expect(screen.getByTestId("fuzzy-preview-chart")).toHaveAttribute(
      "data-height",
      JSON.stringify({ xs: 192, sm: 204, lg: 216 })
    );
  });
});

