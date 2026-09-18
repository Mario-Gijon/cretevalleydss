import { fireEvent, screen } from "@testing-library/react";
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

const numericDiscreteDomain = {
  _id: "domain-nd-1",
  id: "domain-nd-1",
  name: "Numeric discrete",
  typeKey: "numericDiscrete",
  definition: {
    min: -1,
    max: 10,
    step: 0.5,
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

    const input = screen.getByRole("textbox");

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
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

    const input = screen.getByRole("textbox");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Value must be between 0 and 10.")).not.toBeInTheDocument();
  });

  it("keeps continuous numeric text input numeric and rejects invalid text", () => {
    const onChange = vi.fn();

    renderWithProviders(
      <ExpressionDomainEvaluationInput
        expressionDomain={numericContinuousDomain}
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "-" } });
    expect(input).toHaveValue("-");
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "0." } });
    expect(input).toHaveValue("0.");
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "0.7" } });
    expect(onChange).toHaveBeenLastCalledWith(0.7);
    expect(typeof onChange.mock.lastCall[0]).toBe("number");

    fireEvent.change(input, { target: { value: "0.7a" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("0.7");
  });

  it("uses text input for numericDiscrete while preserving numeric validation", () => {
    const onChange = vi.fn();

    renderWithProviders(
      <ExpressionDomainEvaluationInput
        expressionDomain={numericDiscreteDomain}
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByRole("textbox");

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "1.5" } });
    expect(onChange).toHaveBeenLastCalledWith(1.5);
    expect(typeof onChange.mock.lastCall[0]).toBe("number");

    fireEvent.change(input, { target: { value: "1.5x" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("1.5");

    fireEvent.change(input, { target: { value: "1.25" } });
    expect(screen.getByText("Value must follow step 0.5.")).toBeInTheDocument();
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
