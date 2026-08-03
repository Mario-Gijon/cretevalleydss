import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NumberCriterionParameterField from "../../../src/features/decisionPlugins/modelParameters/fields/numberCriterion/NumberCriterionParameterField.jsx";
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

    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "0.125" },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      cost: "0.125",
      quality: "0.25",
    });
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
