import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SelectCriterionParameterField from "../../../src/features/decisionPlugins/modelParameters/fields/selectCriterion/SelectCriterionParameterField.jsx";
import SelectCriterionParameterReadOnly from "../../../src/features/decisionPlugins/modelParameters/fields/selectCriterion/SelectCriterionParameterReadOnly.jsx";

const context = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
  ],
};

const parameter = (overrides = {}) => ({
  key: "preference",
  label: "Preference",
  restrictions: { allowed: ["t3", "t5"] },
  ...overrides,
});

describe("SelectCriterionParameterField", () => {
  it("renders distinct criterion selects and displays a scalar across rows", () => {
    render(<SelectCriterionParameterField parameter={parameter()} value="t5" onChange={vi.fn()} parameterContext={context} />);

    expect(screen.getByRole("combobox", { name: "Preference for Cost" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Preference for Quality" })).toBeInTheDocument();
  });

  it.each([
    [false, [false, true], "boolean"],
    [0, [0, 1], "number"],
  ])("preserves scalar %p drafts", (value, allowed, valueType) => {
    render(<SelectCriterionParameterField parameter={parameter({ valueType, restrictions: { allowed } })} value={value} onChange={vi.fn()} parameterContext={context} />);
    const inputs = screen.getAllByRole("combobox");
    expect(inputs).toHaveLength(2);
    expect(inputs[0].parentElement?.querySelector('input[aria-hidden="true"]')).toHaveValue(String(value));
  });

  it("uses ID-keyed object values, emits a complete map on edit, and preserves typed values", () => {
    const onChange = vi.fn();
    render(<SelectCriterionParameterField parameter={parameter({ restrictions: { allowed: [0, 1] } })} value={{ cost: 0 }} onChange={onChange} parameterContext={context} />);

    const cost = screen.getByRole("combobox", { name: "Preference for Cost" });
    const quality = screen.getByRole("combobox", { name: "Preference for Quality" });
    expect(cost.parentElement?.querySelector('input[aria-hidden="true"]')).toHaveValue("0");
    expect(quality.parentElement?.querySelector('input[aria-hidden="true"]')).toHaveValue("");
    fireEvent.mouseDown(quality);
    fireEvent.click(screen.getByRole("option", { name: "1" }));
    expect(onChange).toHaveBeenLastCalledWith({ cost: 0, quality: 1 });
  });

  it("supports disabled and error states without duplicating the error", () => {
    render(<SelectCriterionParameterField parameter={parameter()} value="t5" onChange={vi.fn()} parameterContext={context} disabled error="Preference is invalid" />);
    expect(screen.getByRole("combobox", { name: "Preference for Cost" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText("Preference is invalid")).toHaveLength(1);
  });
});

describe("SelectCriterionParameterReadOnly", () => {
  it("renders supplied scalar and ID-keyed values without using declared defaults", () => {
    const { rerender } = render(<SelectCriterionParameterReadOnly parameter={parameter({ default: "t3" })} value={false} parameterContext={context} />);
    expect(screen.getAllByText("false")).toHaveLength(2);

    rerender(<SelectCriterionParameterReadOnly parameter={parameter({ default: "t3" })} value={{ cost: 0 }} parameterContext={context} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("t3")).not.toBeInTheDocument();
  });

  it("renders a dash without criteria or a supplied value", () => {
    const { rerender } = render(<SelectCriterionParameterReadOnly parameter={parameter()} value={undefined} parameterContext={context} />);
    expect(screen.getAllByText("—")).toHaveLength(2);
    rerender(<SelectCriterionParameterReadOnly parameter={parameter()} value="t5" parameterContext={{ leafCriteria: [] }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
