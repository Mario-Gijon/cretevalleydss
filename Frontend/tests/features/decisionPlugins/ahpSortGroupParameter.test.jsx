import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PARAMETER_FIELD_REGISTRY } from "../../../src/features/decisionPlugins/modelParameters";
import {
  normalizeAHPSortGroupValue,
  validateAHPSortGroupValue,
} from "../../../src/features/decisionPlugins/modelParameters/fields/ahpSortGroup/normalizeAHPSortGroupValue.js";

const parameter = {
  key: "ahpSortGroup",
  label: "Group classification",
  parameterStructureKey: "ahpSortGroup",
  required: false,
};

const FieldHarness = ({ selectedExpertCount, initialValue }) => {
  const [value, setValue] = useState(initialValue);
  const Field = PARAMETER_FIELD_REGISTRY.ahpSortGroup.FieldComponent;
  return (
    <>
      <Field
        parameter={parameter}
        value={value}
        onChange={setValue}
        parameterContext={{ selectedExpertCount }}
      />
      <output hidden data-testid="group-policy-value">{JSON.stringify(value ?? null)}</output>
    </>
  );
};

describe("AHPSort I group classification parameter", () => {
  it("is discovered as a separate optional Decision Plugin field", () => {
    expect(PARAMETER_FIELD_REGISTRY.ahpSortGroup).toMatchObject({ key: "ahpSortGroup" });
    expect(PARAMETER_FIELD_REGISTRY.ahpSortGroup.FieldComponent).toBeTypeOf("function");
    expect(PARAMETER_FIELD_REGISTRY.ahpSortGroup.ReadOnlyComponent).toBeTypeOf("function");
    expect(parameter).not.toHaveProperty("default");
  });

  it("allows an absent value for one expert and requires it starting with two", () => {
    expect(validateAHPSortGroupValue(parameter, undefined, { selectedExpertCount: 1 })).toBeNull();
    expect(validateAHPSortGroupValue(parameter, undefined, { selectedExpertCount: 2 }))
      .toMatch(/Choose an equal-vote preference/);
    expect(validateAHPSortGroupValue(parameter, { tiePolicy: "optimistic" }, { selectedExpertCount: 4 })).toBeNull();
    expect(validateAHPSortGroupValue(parameter, { tiePolicy: "pessimistic" }, { selectedExpertCount: 3 })).toBeNull();
  });

  it("persists exactly the selected group policy and lets a creator clear it", async () => {
    const user = userEvent.setup();
    render(<FieldHarness selectedExpertCount={3} />);

    const select = screen.getByRole("combobox", { name: "Equal-vote preference" });
    await user.click(select);
    await user.click(await screen.findByRole("option", { name: "More preferred category" }));
    expect(select).toHaveTextContent("More preferred category");
    expect(screen.getByTestId("group-policy-value")).toHaveTextContent(JSON.stringify({ tiePolicy: "optimistic" }));

    await user.click(select);
    await user.click(await screen.findByRole("option", { name: "Less preferred category" }));
    expect(select).toHaveTextContent("Less preferred category");
    expect(screen.getByTestId("group-policy-value")).toHaveTextContent(JSON.stringify({ tiePolicy: "pessimistic" }));

    await user.click(select);
    await user.click(await screen.findByRole("option", { name: "Not set" }));
    expect(screen.getByTestId("group-policy-value")).toHaveTextContent("null");
  });

  it("updates the requirement as expert count changes without losing a configured policy", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<FieldHarness selectedExpertCount={1} />);
    const select = screen.getByRole("combobox", { name: "Equal-vote preference" });
    expect(screen.getByText(/Optional for individual classification/)).toBeInTheDocument();

    rerender(<FieldHarness selectedExpertCount={2} />);
    expect(screen.getByText(/Required with multiple experts/)).toBeInTheDocument();

    await user.click(select);
    await user.click(await screen.findByRole("option", { name: "Less preferred category" }));
    rerender(<FieldHarness selectedExpertCount={1} />);
    expect(screen.getByText(/Optional for individual classification/)).toBeInTheDocument();
    expect(screen.getByTestId("group-policy-value")).toHaveTextContent(JSON.stringify({ tiePolicy: "pessimistic" }));

    rerender(<FieldHarness selectedExpertCount={2} />);
    expect(select).toHaveTextContent("Less preferred category");
  });

  it("rejects invalid values and never merges the central-profile preference into the group policy", () => {
    expect(validateAHPSortGroupValue(parameter, { tiePolicy: "optimistic", extra: true }, { selectedExpertCount: 1 }))
      .toMatch(/Review the group classification settings/);
    expect(validateAHPSortGroupValue(parameter, { tiePolicy: "majority" }, { selectedExpertCount: 3 }))
      .toMatch(/Choose an equal-vote preference/);
    expect(normalizeAHPSortGroupValue(parameter, { tiePolicy: "pessimistic" }))
      .toEqual({ tiePolicy: "pessimistic" });
    expect({ ahpSortProfiles: { tiePolicy: "optimistic" }, ahpSortGroup: { tiePolicy: "pessimistic" } })
      .toEqual({ ahpSortProfiles: { tiePolicy: "optimistic" }, ahpSortGroup: { tiePolicy: "pessimistic" } });
  });

  it("shows a compact read-only policy without exposing technical keys", () => {
    const ReadOnly = PARAMETER_FIELD_REGISTRY.ahpSortGroup.ReadOnlyComponent;
    render(<ReadOnly value={{ tiePolicy: "pessimistic" }} />);
    expect(screen.getByText("Equal-vote preference: less preferred category")).toBeInTheDocument();
    expect(screen.queryByText(/ahpSortGroup|tiePolicy/)).not.toBeInTheDocument();
  });
});
