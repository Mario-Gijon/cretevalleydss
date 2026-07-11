import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AlternativeCriteriaMatrixView from "../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/AlternativeCriteriaMatrixView.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

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

const buildEvaluationContext = (criteria = []) => ({
  alternatives: [
    { id: "alt-a", name: "Alternative A" },
    { id: "alt-b", name: "Alternative B" },
  ],
  leafCriteria: criteria,
});

const buildMatrixPayload = () => ({
  "alt-a": {
    "criterion-1": { value: 7.5 },
    "criterion-2": { value: { labelKey: "low" } },
    "criterion-3": { value: { labelKey: "high" } },
  },
  "alt-b": {
    "criterion-1": { value: 6.5 },
    "criterion-2": { value: { labelKey: "high" } },
    "criterion-3": { value: { labelKey: "low" } },
  },
});

describe("AlternativeCriteriaMatrixView", () => {
  it("renders expression-domain inputs for numeric, ordinal, and fuzzy criteria", () => {
    renderWithProviders(
      <AlternativeCriteriaMatrixView
        evaluationContext={buildEvaluationContext([
          { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
          { id: "criterion-2", name: "Ordinal", expressionDomain: ordinalDomain },
          { id: "criterion-3", name: "Fuzzy", expressionDomain: fuzzyDomain },
        ])}
        evaluationPayload={buildMatrixPayload()}
        setEvaluationPayload={vi.fn()}
        collectivePayload={{
          "alt-a": {
            "criterion-1": 7.2,
            "criterion-3": [0.6, 0.8, 1],
          },
        }}
        readOnly={false}
        loading={false}
      />
    );

    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
    expect(screen.getByText("7.2")).toBeInTheDocument();
    expect(screen.getByText("[0.6, 0.8, 1]")).toBeInTheDocument();
  });

  it("does not interpret legacy collective wrappers", () => {
    renderWithProviders(
      <AlternativeCriteriaMatrixView
        evaluationContext={buildEvaluationContext([
          { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
        ])}
        evaluationPayload={{
          "alt-a": {
            "criterion-1": { value: 7.5 },
          },
          "alt-b": {
            "criterion-1": { value: 6.5 },
          },
        }}
        setEvaluationPayload={vi.fn()}
        collectivePayload={{
          "alt-a": {
            "criterion-1": { localizedLabel: "Legacy" },
          },
        }}
        readOnly={false}
        loading={false}
      />
    );

    expect(screen.queryByText("Legacy")).not.toBeInTheDocument();
  });

  it("renders an alert for malformed matrix payloads", () => {
    renderWithProviders(
      <AlternativeCriteriaMatrixView
        evaluationContext={buildEvaluationContext([
          { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
        ])}
        evaluationPayload={{
          "alt-a": {
            "criterion-1": { value: 7.5 },
          },
        }}
        setEvaluationPayload={vi.fn()}
        collectivePayload={null}
        readOnly={false}
        loading={false}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Evaluation payload is missing an alternative row."
    );
  });

  it("renders an alert for malformed context", () => {
    renderWithProviders(
      <AlternativeCriteriaMatrixView
        evaluationContext={{
          alternatives: [{ id: "alt-a", name: "Alternative A" }],
          leafCriteria: [{ id: "criterion-1", name: "Numeric" }],
        }}
        evaluationPayload={{
          "alt-a": {
            "criterion-1": { value: 7.5 },
          },
        }}
        setEvaluationPayload={vi.fn()}
        collectivePayload={null}
        readOnly={false}
        loading={false}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("expressionDomain is invalid");
  });

  it("withholds the grid while loading without fabricating a matrix", () => {
    const { container } = renderWithProviders(
      <AlternativeCriteriaMatrixView
        evaluationContext={buildEvaluationContext([
          { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
        ])}
        evaluationPayload={undefined}
        setEvaluationPayload={vi.fn()}
        collectivePayload={null}
        readOnly={false}
        loading={true}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
