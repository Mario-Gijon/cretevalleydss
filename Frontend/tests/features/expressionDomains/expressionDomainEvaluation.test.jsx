import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ExpressionDomainEvaluationInput from "../../../src/features/expressionDomains/ExpressionDomainEvaluationInput.jsx";
import {
  validateExpressionDomainEvaluation,
} from "../../../src/features/expressionDomains/index.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const numericContinuousDomain = {
  _id: "domain-nc-1",
  id: "domain-nc-1",
  name: "Numeric 0-10",
  typeKey: "numericContinuous",
  definition: {
    min: 0,
    max: 10,
    step: null,
  },
};

const linguisticOrdinalDomain = {
  _id: "domain-lo-1",
  id: "domain-lo-1",
  name: "Ordinal labels",
  typeKey: "linguisticOrdinal",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "medium", label: "Medium", index: 1 },
      { key: "high", label: "High", index: 2 },
    ],
  },
};

const linguistic2TupleDomain = {
  typeKey: "linguistic2Tuple",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "high", label: "High", index: 1 },
    ],
  },
};

describe("validateExpressionDomainEvaluation", () => {
  it("normalizes numericContinuous values", () => {
    expect(
      validateExpressionDomainEvaluation({
        value: "4.5",
        expressionDomain: numericContinuousDomain,
      })
    ).toBe(4.5);
  });

  it("rejects out-of-range numericContinuous values", () => {
    expect(() =>
      validateExpressionDomainEvaluation({
        value: 12,
        expressionDomain: numericContinuousDomain,
      })
    ).toThrow("Value must be between 0 and 10.");
  });

  it("accepts a valid linguisticOrdinal label key", () => {
    expect(
      validateExpressionDomainEvaluation({
        value: { labelKey: "medium" },
        expressionDomain: linguisticOrdinalDomain,
      })
    ).toEqual({ labelKey: "medium" });
  });

  it("rejects an unknown linguisticOrdinal label key", () => {
    expect(() =>
      validateExpressionDomainEvaluation({
        value: { labelKey: "unknown" },
        expressionDomain: linguisticOrdinalDomain,
      })
    ).toThrow("Select a valid domain label.");
  });

  it("throws a clear error when expressionDomain.typeKey is missing", () => {
    expect(() =>
      validateExpressionDomainEvaluation({
        value: 1,
        expressionDomain: { definition: {} },
      })
    ).toThrow("expressionDomain.typeKey is required.");
  });
});

describe("ExpressionDomainEvaluationInput", () => {
  it("renders the registered core EvaluationInput for a known type", () => {
    renderWithProviders(
      <ExpressionDomainEvaluationInput
        expressionDomain={numericContinuousDomain}
        value={5}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("supports compact numeric rendering without helper text while keeping error state", () => {
    renderWithProviders(
      <ExpressionDomainEvaluationInput
        expressionDomain={numericContinuousDomain}
        value={12}
        onChange={vi.fn()}
        showHelperText={false}
      />
    );

    const input = screen.getByRole("spinbutton");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Value must be between 0 and 10.")).not.toBeInTheDocument();
  });

  it("forwards an optional collective value to the registered input", () => {
    renderWithProviders(
      <ExpressionDomainEvaluationInput
        expressionDomain={linguistic2TupleDomain}
        value={{ labelKey: "low", alpha: 0 }}
        collectiveValue={{ labelKey: "high", alpha: 0 }}
        onChange={vi.fn()}
        disabled
      />
    );

    expect(screen.getByText("High (α = 0)")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
