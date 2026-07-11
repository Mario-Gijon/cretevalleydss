import { screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../src/components/FuzzyPreviewChart/FuzzyPreviewChart.jsx",
  () => ({
    FuzzyPreviewChart: ({ labels, height }) => (
      <div
        data-testid="fuzzy-preview-chart"
        data-height={JSON.stringify(height)}
      >
        {labels.map((label) => label.label).join(",")}
      </div>
    ),
  })
);

import LinguisticFuzzyCreationForm from "../../../src/features/expressionDomains/types/linguisticFuzzy/LinguisticFuzzyCreationForm.jsx";
import { validateLinguisticLabelValues } from "../../../src/utils/linguisticMembershipFunctions.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const FuzzyFormHarness = ({ initialValue }) => {
  const [value, setValue] = useState(
    initialValue || {
      name: "",
      typeKey: "linguisticFuzzy",
      definition: {},
    }
  );

  return (
    <>
      <LinguisticFuzzyCreationForm value={value} onChange={setValue} />
      <pre data-testid="fuzzy-draft">{JSON.stringify(value)}</pre>
    </>
  );
};

describe("LinguisticFuzzyCreationForm", () => {
  it("starts new drafts with three Low/Medium/High labels and valid automatic values", () => {
    renderWithProviders(<FuzzyFormHarness />);

    expect(screen.getByLabelText("Number of labels")).toHaveValue(3);
    expect(screen.getByDisplayValue("Low")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Medium")).toBeInTheDocument();
    expect(screen.getByDisplayValue("High")).toBeInTheDocument();

    const draft = JSON.parse(screen.getByTestId("fuzzy-draft").textContent);
    expect(draft.definition.labelCount).toBe(3);
    expect(draft.definition.labels.map((label) => label.label)).toEqual([
      "Low",
      "Medium",
      "High",
    ]);
    expect(
      draft.definition.labels.every((label) =>
        validateLinguisticLabelValues(label.values, 3)
      )
    ).toBe(true);
  });

  it("preserves existing five-label names while editing and passes a bounded preview height", () => {
    renderWithProviders(
      <FuzzyFormHarness
        initialValue={{
          name: "Existing fuzzy",
          typeKey: "linguisticFuzzy",
          definition: {
            membershipFunction: "triangular",
            labelCount: 5,
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

    expect(screen.getByDisplayValue("Very Low")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Very High")).toBeInTheDocument();
    expect(screen.getByTestId("fuzzy-preview-chart")).toBeInTheDocument();
    expect(screen.getByTestId("fuzzy-preview-chart")).toHaveAttribute(
      "data-height",
      JSON.stringify({ xs: 210, sm: 230, md: 260, lg: 280 })
    );
  });
});
