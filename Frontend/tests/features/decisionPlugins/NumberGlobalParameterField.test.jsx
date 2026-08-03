import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NumberGlobalParameterField from "../../../src/features/decisionPlugins/modelParameters/fields/numberGlobal/NumberGlobalParameterField.jsx";

const buildParameter = (overrides = {}) => ({
  key: "alpha",
  label: "Alpha",
  parameterStructureKey: "numberGlobal",
  valueType: "number",
  required: true,
  default: 0.5,
  restrictions: { min: -10, max: 10, allowed: null },
  ...overrides,
});

const renderField = ({
  parameter = buildParameter(),
  value = parameter.default,
  onChange = vi.fn(),
  disabled = false,
  error = "",
} = {}) => {
  render(
    <NumberGlobalParameterField
      parameter={parameter}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
      parameterContext={{}}
    />
  );

  return {
    input: screen.getByRole("spinbutton", { name: parameter.label }),
    onChange,
  };
};

describe("NumberGlobalParameterField", () => {
  it("displays numeric defaults and zero", () => {
    const { input } = renderField({ value: 0 });
    expect(input).toHaveValue(0);
  });

  it.each(["0.123456789", "-3.14159265", "1e-7", ""])(
    "emits the raw numeric draft %p",
    (draft) => {
      const { input, onChange } = renderField();

      fireEvent.change(input, { target: { value: draft } });

      expect(onChange).toHaveBeenLastCalledWith(draft);
    }
  );

  it("does not truncate an integer draft and uses integer stepping", () => {
    const parameter = buildParameter({
      valueType: "integer",
      default: 4,
      restrictions: { min: 1, max: 10, allowed: null },
    });
    const { input, onChange } = renderField({ parameter });

    fireEvent.change(input, { target: { value: "4.5" } });

    expect(onChange).toHaveBeenCalledWith("4.5");
    expect(input).toHaveAttribute("step", "1");
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "10");
  });

  it("uses unrestricted number stepping and applies disabled and error state", () => {
    const { input } = renderField({
      disabled: true,
      error: "Alpha is invalid",
    });

    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("step", "any");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Alpha is invalid")).toBeInTheDocument();
  });
});
