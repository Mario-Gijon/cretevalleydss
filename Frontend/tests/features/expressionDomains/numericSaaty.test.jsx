import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NumericSaatyEvaluationInput from "../../../src/features/expressionDomains/types/numericSaaty/NumericSaatyEvaluationInput.jsx";
import { validateNumericSaatyEvaluation } from "../../../src/features/expressionDomains/types/numericSaaty/evaluation.js";
import { SAATY_SCALE_VALUES } from "../../../src/features/expressionDomains/types/numericSaaty/saatyScale.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const domain = {
  typeKey: "numericSaaty",
  definition: { scale: "saaty-fundamental-1-9" },
};

describe("numericSaaty expression domain", () => {
  it("validates the 17 canonical ratios and rejects intermediate numbers", () => {
    for (const value of SAATY_SCALE_VALUES) {
      expect(validateNumericSaatyEvaluation({ value, expressionDomain: domain })).toBe(value);
    }
    expect(() => validateNumericSaatyEvaluation({ value: 1.7, expressionDomain: domain })).toThrow(/17 fundamental/);
    expect(() => validateNumericSaatyEvaluation({ value: 2.5, expressionDomain: domain })).toThrow(/17 fundamental/);
    expect(() => validateNumericSaatyEvaluation({ value: 0.7, expressionDomain: domain })).toThrow(/17 fundamental/);
  });

  it("renders fraction labels and persists the exact numeric reciprocal ratio", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <NumericSaatyEvaluationInput
        expressionDomain={domain}
        value={1 / 3}
        onChange={onChange}
        inputProps={{ "aria-label": "Saaty judgment" }}
      />
    );

    expect(screen.getByRole("combobox", { name: "Saaty judgment" })).toHaveTextContent("1/3");
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Saaty judgment" }));
    expect(screen.getAllByRole("option")).toHaveLength(17);
    expect(screen.getByRole("option", { name: "1/3", exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "5", exact: true }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("shows an unsupported saved value without silently changing it", () => {
    renderWithProviders(
      <NumericSaatyEvaluationInput
        expressionDomain={domain}
        value={1.7}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("Unsupported saved value (1.7)")).toBeInTheDocument();
    expect(screen.getByText("Value must be one of Saaty's 17 fundamental scale values.")).toBeInTheDocument();
  });
});
