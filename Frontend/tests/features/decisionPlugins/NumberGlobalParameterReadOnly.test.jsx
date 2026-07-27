import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NumberGlobalParameterReadOnly from "../../../src/features/decisionPlugins/modelParameters/fields/numberGlobal/NumberGlobalParameterReadOnly.jsx";

const parameter = {
  key: "alpha",
  label: "Alpha",
  valueType: "number",
  scope: "global",
  parameterStructureKey: "numberGlobal",
  required: true,
  default: 9,
  restrictions: { min: null, max: null, allowed: null },
};

const renderValue = (value) =>
  render(
    <NumberGlobalParameterReadOnly
      parameter={parameter}
      value={value}
      parameterContext={{}}
    />
  );

describe("NumberGlobalParameterReadOnly", () => {
  it.each([
    [0, "0"],
    [0.123456789, "0.123456789"],
    [-3.5, "-3.5"],
    ["1e-7", "1e-7"],
  ])("renders %p without rounding", (value, expected) => {
    renderValue(value);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([null, undefined, ""])(
    "renders an empty supplied value as an em dash instead of using the default",
    (value) => {
      renderValue(value);
      expect(screen.getByText("—")).toBeInTheDocument();
      expect(screen.queryByText("9")).not.toBeInTheDocument();
    }
  );
});
