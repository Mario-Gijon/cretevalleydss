import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SelectGlobalParameterField from "../../../src/features/decisionPlugins/modelParameters/fields/selectGlobal/SelectGlobalParameterField.jsx";
import SelectGlobalParameterReadOnly from "../../../src/features/decisionPlugins/modelParameters/fields/selectGlobal/SelectGlobalParameterReadOnly.jsx";

const buildParameter = (overrides = {}) => ({
  key: "choice",
  label: "Choice",
  valueType: "number",
  restrictions: { allowed: [0, 1] },
  default: 1,
  ...overrides,
});

const renderField = ({ parameter = buildParameter(), value, onChange = vi.fn(), ...props } = {}) => {
  render(
    <SelectGlobalParameterField
      parameter={parameter}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
  return { combobox: screen.getByRole("combobox", { name: parameter.label }), onChange };
};

const openOptions = (combobox) => {
  fireEvent.mouseDown(combobox);
};

describe("SelectGlobalParameterField", () => {
  it("renders numeric, string, and boolean options visibly", () => {
    const { combobox } = renderField({
      parameter: buildParameter({ valueType: "number", restrictions: { allowed: [0, 1] } }),
      value: 0,
    });
    expect(combobox).toHaveValue("0");
    openOptions(combobox);
    expect(screen.getByRole("option", { name: "0" })).toBeVisible();
    expect(screen.getByRole("option", { name: "1" })).toBeVisible();

    renderField({
      parameter: buildParameter({ valueType: "string", restrictions: { allowed: ["alpha", "beta"] } }),
      value: "alpha",
    });
    openOptions(screen.getAllByRole("combobox", { name: "Choice" })[1]);
    expect(screen.getByRole("option", { name: "beta" })).toBeVisible();

    renderField({
      parameter: buildParameter({ valueType: "boolean", restrictions: { allowed: [true, false] } }),
      value: false,
    });
    openOptions(screen.getAllByRole("combobox", { name: "Choice" })[2]);
    expect(screen.getAllByRole("option", { name: "true" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("option", { name: "false" }).length).toBeGreaterThan(0);
  });

  it.each([
    ["number", 0],
    ["boolean", false],
    ["string", "alpha"],
  ])("preserves the supplied %s value", (_type, value) => {
    const { combobox } = renderField({
      parameter: buildParameter({
        valueType: _type,
        restrictions: { allowed: _type === "number" ? [0, 1] : _type === "boolean" ? [false, true] : ["alpha", "beta"] },
      }),
      value,
    });
    expect(combobox).toHaveValue(String(value));
  });

  it("does not apply a local default when the supplied value is absent", () => {
    const { combobox } = renderField({ value: undefined });
    expect(combobox).toHaveValue("");
  });

  it.each([
    ["number", 0.5, [0, 0.5]],
    ["boolean", true, [false, true]],
    ["string", "beta", ["alpha", "beta"]],
  ])("emits the selected %s primitive", (_type, selected, allowed) => {
    const { combobox, onChange } = renderField({
      parameter: buildParameter({ valueType: _type, restrictions: { allowed } }),
      value: allowed[0],
    });
    openOptions(combobox);
    fireEvent.click(screen.getByRole("option", { name: String(selected) }));
    expect(onChange).toHaveBeenLastCalledWith(selected);
  });

  it.each([
    { restrictions: undefined },
    { restrictions: {} },
    { restrictions: { allowed: [] } },
  ])("renders safely with malformed allowed metadata: %p", (overrides) => {
    expect(() => renderField({ parameter: buildParameter(overrides) })).not.toThrow();
    expect(screen.getByRole("combobox", { name: "Choice" })).toBeDisabled();
  });

  it("supports disabled and error states with an accessible label", () => {
    const { combobox } = renderField({ disabled: true, error: "Choice is invalid" });
    expect(combobox).toBeDisabled();
    expect(combobox).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Choice is invalid")).toBeInTheDocument();
  });
});

describe("SelectGlobalParameterReadOnly", () => {
  it.each([
    [1, "1"],
    [0, "0"],
    [true, "true"],
    [false, "false"],
    ["text", "text"],
    [null, "—"],
    [undefined, "—"],
    ["", "—"],
  ])("renders %p as %s", (value, expected) => {
    render(
      <SelectGlobalParameterReadOnly
        parameter={{ default: "fallback" }}
        value={value}
      />
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("does not fall back to parameter.default", () => {
    render(
      <SelectGlobalParameterReadOnly
        parameter={{ default: "fallback" }}
        value={undefined}
      />
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("fallback")).not.toBeInTheDocument();
  });
});
