import { createRef, useState } from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AlternativeCriteriaMatrixView from "../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/AlternativeCriteriaMatrixView.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const numericContinuousDomain = {
  id: "domain-cost",
  _id: "domain-cost",
  name: "Numeric 0-10",
  typeKey: "numericContinuous",
  family: "numeric",
  definition: {
    min: 0,
    max: 10,
    step: null,
  },
};

const linguisticOrdinalDomain = {
  id: "domain-quality",
  _id: "domain-quality",
  name: "Low/Medium/High",
  typeKey: "linguisticOrdinal",
  family: "linguistic",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "medium", label: "Medium", index: 1 },
      { key: "high", label: "High", index: 2 },
    ],
  },
};

const evaluationContext = {
  alternatives: [
    { id: "alt-1", name: "Option A" },
  ],
  leafCriteria: [
    {
      id: "criterion-cost",
      name: "Cost",
      type: "cost",
      expressionDomain: numericContinuousDomain,
    },
    {
      id: "criterion-quality",
      name: "Quality",
      type: "benefit",
      expressionDomain: linguisticOrdinalDomain,
    },
  ],
};

const StatefulMatrixView = ({
  initialPayload,
  viewRef = null,
}) => {
  const [payload, setPayload] = useState(initialPayload);

  return (
    <AlternativeCriteriaMatrixView
      ref={viewRef}
      evaluationContext={evaluationContext}
      evaluationPayload={payload}
      setEvaluationPayload={setPayload}
      collectivePayload={null}
      readOnly={false}
      loading={false}
    />
  );
};

describe("AlternativeCriteriaMatrixView", () => {
  it("renders numeric and linguistic cells through the shared input path", () => {
    renderWithProviders(
      <StatefulMatrixView
        initialPayload={{
          "alt-1": {
            "criterion-cost": {
              value: 5,
              expressionDomain: numericContinuousDomain,
            },
            "criterion-quality": {
              value: { labelKey: "medium" },
              expressionDomain: linguisticOrdinalDomain,
            },
          },
        }}
      />
    );

    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("marks an invalid numeric cell without showing helper text", () => {
    const viewRef = createRef();

    renderWithProviders(
      <StatefulMatrixView
        viewRef={viewRef}
        initialPayload={{
          "alt-1": {
            "criterion-cost": {
              value: 12,
              expressionDomain: numericContinuousDomain,
            },
            "criterion-quality": {
              value: { labelKey: "medium" },
              expressionDomain: linguisticOrdinalDomain,
            },
          },
        }}
      />
    );

    const input = screen.getByRole("spinbutton");
    const validationResult = viewRef.current.validatePayloadRead();

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Value must be between 0 and 10.")).not.toBeInTheDocument();
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: "alt-1",
          criterionId: "criterion-cost",
          message: "Value must be between 0 and 10.",
        }),
      ])
    );
  });
});
