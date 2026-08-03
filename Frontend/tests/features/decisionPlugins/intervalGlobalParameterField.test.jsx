import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import IntervalGlobalParameterField from "../../../src/features/decisionPlugins/modelParameters/fields/intervalGlobal/IntervalGlobalParameterField.jsx";
import IntervalGlobalParameterReadOnly from "../../../src/features/decisionPlugins/modelParameters/fields/intervalGlobal/IntervalGlobalParameterReadOnly.jsx";

const parameter = {
  key: "interval",
  label: "Agreement interval",
  restrictions: { min: -1, max: 2, ordered: "strictIncreasing" },
  default: [0.3, 0.8],
};

const renderField = (overrides = {}) => {
  const onChange = overrides.onChange || vi.fn();
  render(<IntervalGlobalParameterField parameter={parameter} value={[0, 0.8]} onChange={onChange} {...overrides} />);
  return {
    lower: screen.getByRole("spinbutton", { name: "Agreement interval lower bound" }),
    upper: screen.getByRole("spinbutton", { name: "Agreement interval upper bound" }),
    onChange,
  };
};

describe("IntervalGlobalParameterField", () => {
  it("renders two accessible raw numeric drafts and preserves zero", () => {
    const { lower, upper } = renderField({ value: [0, "2.345678"] });
    expect(lower).toHaveValue(0);
    expect(upper).toHaveValue(2.345678);
    expect(lower).toHaveAttribute("step", "any");
    expect(lower).toHaveAttribute("min", "-1");
    expect(upper).toHaveAttribute("max", "2");
  });

  it("emits raw endpoint text while preserving the other endpoint", () => {
    const { lower, upper, onChange } = renderField({ value: ["-0.5", "2.345678"] });
    fireEvent.change(lower, { target: { value: "-0.123456" } });
    expect(onChange).toHaveBeenLastCalledWith(["-0.123456", "2.345678"]);
    fireEvent.change(upper, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(["-0.5", ""]);
  });

  it("renders defensively with malformed restrictions", () => {
    expect(() => renderField({ parameter: { ...parameter, restrictions: null } })).not.toThrow();
  });

  it("supports disabled errors", () => {
    const { lower } = renderField({ disabled: true, error: "Invalid interval" });
    expect(lower).toBeDisabled();
    expect(lower).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Invalid interval")).toBeInTheDocument();
  });
});

describe("IntervalGlobalParameterReadOnly", () => {
  it.each([
    [[0.3, 0.8], "0.3 → 0.8"],
    [[0, 1], "0 → 1"],
    [[-1, 2.345678], "-1 → 2.345678"],
    [undefined, "—"],
    ["", "—"],
  ])("renders supplied %p as %s", (value, expected) => {
    render(<IntervalGlobalParameterReadOnly parameter={{ default: [0.3, 0.8] }} value={value} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
