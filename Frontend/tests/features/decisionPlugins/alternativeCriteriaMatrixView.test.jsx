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

  it("does not show a chip for a missing collective cell and does not show an error for null collectivePayload", () => {
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
        collectivePayload={null}
        readOnly={false}
        loading={false}
      />
    );

    expect(screen.queryByText("7.2")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

  it("renders a collective payload alert for legacy wrapper values and keeps editable inputs rendered", () => {
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

    expect(screen.getByRole("alert")).toHaveTextContent("Collective payload cell");
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
    expect(screen.queryByText("Legacy")).not.toBeInTheDocument();
  });

  it("renders a collective payload alert for object, string, empty-array, and mixed-array present values", () => {
    const criteria = [
      { id: "criterion-1", name: "Numeric", expressionDomain: numericDomain },
    ];

    for (const collectivePayload of [
      { "alt-a": { "criterion-1": { value: 7.2 } } },
      { "alt-a": { "criterion-1": "7.2" } },
      { "alt-a": { "criterion-1": [] } },
      { "alt-a": { "criterion-1": [0.6, "bad"] } },
    ]) {
      const { unmount } = renderWithProviders(
        <AlternativeCriteriaMatrixView
          evaluationContext={buildEvaluationContext(criteria)}
          evaluationPayload={{
            "alt-a": {
              "criterion-1": { value: 7.5 },
            },
            "alt-b": {
              "criterion-1": { value: 6.5 },
            },
          }}
          setEvaluationPayload={vi.fn()}
          collectivePayload={collectivePayload}
          readOnly={false}
          loading={false}
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
        evaluationContext={buildEvaluationContext(criteria)}
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
          "alt-c": {
            "criterion-1": 7.2,
          },
        }}
        readOnly={false}
        loading={false}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Collective payload contains unknown alternative rows."
    );
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
    unmount();

    renderWithProviders(
      <AlternativeCriteriaMatrixView
        evaluationContext={buildEvaluationContext(criteria)}
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
            "criterion-2": 7.2,
          },
        }}
        readOnly={false}
        loading={false}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Collective alternative row contains unknown criterion cells."
    );
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });
});
