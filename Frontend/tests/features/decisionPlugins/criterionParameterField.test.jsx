import { fireEvent, render, screen } from "@testing-library/react";
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

    const combobox = screen.getAllByRole("combobox")[0];
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
