import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NumberCriterionParameterField from "../../../src/features/decisionPlugins/modelParameters/fields/numberCriterion/NumberCriterionParameterField.jsx";
import NumberCriterionParameterReadOnly from "../../../src/features/decisionPlugins/modelParameters/fields/numberCriterion/NumberCriterionParameterReadOnly.jsx";
import SelectCriterionParameterField from "../../../src/features/decisionPlugins/modelParameters/fields/selectCriterion/SelectCriterionParameterField.jsx";

const parameterContext = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
  ],
};

describe("criterion parameter fields", () => {
  it.each([
    {
      name: "number",
      Component: NumberCriterionParameterField,
      parameter: { label: "Threshold", restrictions: {} },
      value: { cost: "0.25", stale: "0.5" },
      expected: { cost: "0.25", quality: "" },
    },
    {
      name: "select",
      Component: SelectCriterionParameterField,
      parameter: { key: "mode", label: "Mode", restrictions: { allowed: ["standard", "strict"] } },
      value: { cost: "standard", stale: "old" },
      expected: { cost: "standard", quality: "" },
    },
  ])("reconciles a stale $name map exactly once", async ({ Component, parameter, value, expected }) => {
    const onChange = vi.fn();
    render(<Component parameter={parameter} value={value} onChange={onChange} parameterContext={parameterContext} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenLastCalledWith(expected);
  });

  it.each([
    { name: "number", Component: NumberCriterionParameterField, parameter: { label: "Threshold", restrictions: {} }, value: { cost: "0.25", quality: "0.5" } },
    { name: "select", Component: SelectCriterionParameterField, parameter: { key: "mode", label: "Mode", restrictions: { allowed: ["standard", "strict"] } }, value: { cost: "standard", quality: "strict" } },
  ])("does not reconcile an already canonical $name map", async ({ Component, parameter, value }) => {
    const onChange = vi.fn();
    render(<Component parameter={parameter} value={value} onChange={onChange} parameterContext={parameterContext} />);

    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  it.each([
    { name: "number", Component: NumberCriterionParameterField, parameter: { label: "Threshold", restrictions: {} } },
    { name: "select", Component: SelectCriterionParameterField, parameter: { key: "mode", label: "Mode", restrictions: { allowed: ["standard", "strict"] } } },
  ])("does not reconcile $name maps without visible criteria", async ({ Component, parameter }) => {
    const onChange = vi.fn();
    render(<Component parameter={parameter} value={{ stale: "old" }} onChange={onChange} parameterContext={{ leafCriteria: [] }} />);

    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  it.each([
    { name: "number", Component: NumberCriterionParameterField, parameter: { label: "Threshold", restrictions: {} } },
    { name: "select", Component: SelectCriterionParameterField, parameter: { key: "mode", label: "Mode", restrictions: { allowed: ["standard", "strict"] } } },
  ])("does not reconcile a $name map when context is missing", async ({ Component, parameter }) => {
    const onChange = vi.fn();
    render(<Component parameter={parameter} value={{ stale: "old" }} onChange={onChange} />);

    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  it.each([
    { name: "number", Component: NumberCriterionParameterField, parameter: { label: "Threshold", restrictions: {} }, value: "0.25" },
    { name: "select", Component: SelectCriterionParameterField, parameter: { key: "mode", label: "Mode", restrictions: { allowed: ["standard", "strict"] } }, value: "standard" },
  ])("does not convert scalar $name drafts before an edit", async ({ Component, parameter, value }) => {
    const onChange = vi.fn();
    const { rerender } = render(<Component parameter={parameter} value={value} onChange={onChange} parameterContext={parameterContext} />);
    rerender(<Component parameter={parameter} value={value} onChange={onChange} parameterContext={{ leafCriteria: [{ id: "cost", name: "Cost" }] }} />);

    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  it("expands a scalar number default before the first criterion edit", () => {
    const onChange = vi.fn();
    render(
      <NumberCriterionParameterField
        parameter={{ label: "Threshold", default: "0.25", restrictions: {} }}
        value="0.25"
        onChange={onChange}
        parameterContext={parameterContext}
      />
    );

    fireEvent.change(screen.getAllByRole("spinbutton")[0], {
      target: { value: "0.125" },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      cost: "0.125",
      quality: "0.25",
    });
  });

  it("uses raw scalar and map drafts without a local default fallback", () => {
    render(
      <NumberCriterionParameterField
        parameter={{ label: "Threshold", default: 99, restrictions: { min: -1, max: 2 } }}
        value={{ cost: "-0.123456789" }}
        onChange={vi.fn()}
        parameterContext={parameterContext}
      />
    );

    expect(screen.getByRole("spinbutton", { name: "Threshold for Cost" })).toHaveValue(-0.123456789);
    expect(screen.getByRole("spinbutton", { name: "Threshold for Quality" })).toHaveValue(null);
    expect(screen.getByRole("spinbutton", { name: "Threshold for Cost" })).toHaveAttribute("step", "any");
  });

  it("expands a scalar selection default before the first criterion edit", () => {
    const onChange = vi.fn();
    render(
      <SelectCriterionParameterField
        parameter={{
          key: "mode",
          label: "Mode",
          default: "standard",
          restrictions: { allowed: ["standard", "strict"] },
        }}
        value="standard"
        onChange={onChange}
        parameterContext={parameterContext}
      />
    );

    const combobox = screen.getByRole("combobox", { name: "Mode for Cost" });
    fireEvent.mouseDown(combobox);
    fireEvent.click(screen.getByRole("option", { name: "strict" }));

    expect(onChange).toHaveBeenLastCalledWith({
      cost: "strict",
      quality: "standard",
    });
  });
});

describe("NumberCriterionParameterReadOnly", () => {
  it("renders supplied values exactly and ignores the declared default", () => {
    render(
      <NumberCriterionParameterReadOnly
        parameter={{ default: 99 }}
        value={{ cost: 0.123456789 }}
        parameterContext={parameterContext}
      />
    );

    expect(screen.getByText("0.123456789")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
