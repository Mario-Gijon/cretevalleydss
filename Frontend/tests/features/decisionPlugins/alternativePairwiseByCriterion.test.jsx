import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../src/features/expressionDomains/ExpressionDomainEvaluationInput.jsx",
  () => ({
    default: ({ value, onChange, disabled = false }) => (
      <input
        aria-label="expression-domain-input"
        type="text"
        value={
          typeof value === "number"
            ? String(value)
            : typeof value === "string"
              ? value
              : value?.labelKey || ""
        }
        onChange={(event) => {
          const rawValue = event.target.value;

          if (rawValue === "") {
            onChange?.("");
            return;
          }

          const parsed = Number(rawValue);
          onChange?.(Number.isFinite(parsed) ? parsed : rawValue);
        }}
        disabled={disabled}
      />
    ),
  })
);

import PairwiseAlternativesGrid from "../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/components/PairwiseAlternativesGrid.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const alternatives = [
  { id: "alt-a", name: "Alternative A" },
  { id: "alt-b", name: "Alternative B" },
];

const numericContinuousDomain = {
  typeKey: "numericContinuous",
  definition: {
    min: 1,
    max: 5,
  },
};

const numericDiscreteDomain = {
  typeKey: "numericDiscrete",
  definition: {
    min: 0,
    max: 1,
    step: 0.125,
  },
};

const canonicalEmptyEvaluations = {
  "alt-a": {
    "alt-b": { value: "" },
  },
  "alt-b": {
    "alt-a": { value: "" },
  },
};

const GridHarness = ({
  expressionDomain,
  initialEvaluations = canonicalEmptyEvaluations,
  permitEdit = true,
  collectiveEvaluations = null,
}) => {
  const [evaluations, setEvaluations] = useState(initialEvaluations);

  return (
    <>
      <PairwiseAlternativesGrid
        alternatives={alternatives}
        expressionDomain={expressionDomain}
        evaluations={evaluations}
        setEvaluations={setEvaluations}
        permitEdit={permitEdit}
        collectiveEvaluations={collectiveEvaluations}
      />
      <pre data-testid="evaluations">{JSON.stringify(evaluations)}</pre>
    </>
  );
};

describe("PairwiseAlternativesGrid", () => {
  it("uses ExpressionDomainEvaluationInput for the upper triangle and keeps the lower triangle read-only", () => {
    renderWithProviders(
      <GridHarness expressionDomain={numericContinuousDomain} />
    );

    expect(screen.getAllByLabelText("expression-domain-input")).toHaveLength(1);
    expect(screen.getAllByText("Neutral")).toHaveLength(2);
    expect(document.querySelectorAll(".diagonal-cell")).toHaveLength(2);
  });

  it("renders a DataGrid matrix with alternative row and column headers", () => {
    renderWithProviders(<GridHarness expressionDomain={numericContinuousDomain} />);

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByText("Alternative A").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Alternative B").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Alternatives")).toBeInTheDocument();
  });

  it("changing a numeric upper value updates the reflected lower value", async () => {
    renderWithProviders(
      <GridHarness expressionDomain={numericContinuousDomain} />
    );

    const input = screen.getByLabelText("expression-domain-input");

    fireEvent.change(input, { target: { value: "2" } });

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByTestId("evaluations")).toHaveTextContent(
      '{"alt-a":{"alt-b":{"value":2}},"alt-b":{"alt-a":{"value":4}}}'
    );
  });

  it("displays an error for an incompatible discrete domain", () => {
    renderWithProviders(
      <GridHarness
        expressionDomain={{
          typeKey: "numericDiscrete",
          definition: { min: 0, max: 1, step: 0.3 },
        }}
      />
    );

    expect(
      screen.getByText(
        "This discrete domain cannot be used for pairwise comparisons because some reflected values do not align with its step."
      )
    ).toBeInTheDocument();
  });

  it("reflects a real numericDiscrete value without rounding", async () => {
    renderWithProviders(
      <GridHarness expressionDomain={numericDiscreteDomain} />
    );

    const input = screen.getByLabelText("expression-domain-input");

    fireEvent.change(input, { target: { value: "0.125" } });

    expect(screen.getByText("0.875")).toBeInTheDocument();
  });

  it("renders an error for a malformed matrix", () => {
    renderWithProviders(
      <GridHarness
        expressionDomain={numericContinuousDomain}
        initialEvaluations={{
          "alt-a": {
            "alt-b": { value: "" },
          },
        }}
      />
    );

    expect(
      screen.getByText('Pairwise evaluations are missing row "alt-b".')
    ).toBeInTheDocument();
  });

  it("renders collective chips only for non-diagonal canonical cells", () => {
    renderWithProviders(
      <GridHarness
        expressionDomain={numericContinuousDomain}
        collectiveEvaluations={{
          "alt-a": { "alt-b": 0.6 },
          "alt-b": { "alt-a": 0.4 },
        }}
      />
    );

    expect(screen.getAllByText("0.6")).toHaveLength(1);
    expect(screen.getAllByText("0.4")).toHaveLength(1);
    expect(document.querySelectorAll(".diagonal-cell .MuiChip-root")).toHaveLength(0);
  });
});
