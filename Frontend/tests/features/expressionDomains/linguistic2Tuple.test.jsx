import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import Linguistic2TupleCreationForm from "../../../src/features/expressionDomains/types/linguistic2Tuple/Linguistic2TupleCreationForm.jsx";
import Linguistic2TupleEvaluationInput from "../../../src/features/expressionDomains/types/linguistic2Tuple/Linguistic2TupleEvaluationInput.jsx";
import { validateLinguistic2TupleEvaluation } from "../../../src/features/expressionDomains/types/linguistic2Tuple/evaluation.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const domain = {
  typeKey: "linguistic2Tuple",
  definition: {
    labels: [
      { key: "very_low", label: "Very Low", index: 0 },
      { key: "low", label: "Low", index: 1 },
      { key: "medium", label: "Medium", index: 2 },
      { key: "high", label: "High", index: 3 },
      { key: "very_high", label: "Very High", index: 4 },
    ],
  },
};

const FormHarness = () => {
  const [value, setValue] = useState({
    name: "",
    typeKey: "linguistic2Tuple",
    definition: {},
  });

  return (
    <>
      <Linguistic2TupleCreationForm value={value} onChange={setValue} />
      <pre data-testid="two-tuple-draft">{JSON.stringify(value)}</pre>
    </>
  );
};

describe("linguistic2Tuple evaluation", () => {
  it.each([
    { labelKey: "medium", alpha: 0 },
    { labelKey: "medium", alpha: 0.27 },
    { labelKey: "high", alpha: -0.27 },
    { labelKey: "low", alpha: -0.5 },
    { labelKey: "medium", alpha: 0.49999999999999994 },
    { labelKey: "very_low", alpha: 0 },
    { labelKey: "very_high", alpha: 0 },
  ])("accepts %o", (value) => {
    expect(
      validateLinguistic2TupleEvaluation({ value, expressionDomain: domain })
    ).toEqual(value);
  });

  it.each([
    "high",
    [],
    null,
    { labelKey: "high" },
    { alpha: 0 },
    { labelKey: "high", alpha: 0, extra: true },
    { labelKey: "unknown", alpha: 0 },
    { labelKey: "high", alpha: "0" },
    { labelKey: "high", alpha: Number.NaN },
    { labelKey: "high", alpha: Number.POSITIVE_INFINITY },
    { labelKey: "high", alpha: -0.5000001 },
    { labelKey: "high", alpha: 0.5 },
    { labelKey: "high", alpha: 0.5000001 },
    { labelKey: "very_low", alpha: -0.1 },
    { labelKey: "very_high", alpha: 0.1 },
  ])("rejects %o", (value) => {
    expect(() =>
      validateLinguistic2TupleEvaluation({ value, expressionDomain: domain })
    ).toThrow();
  });
});

describe("Linguistic2TupleEvaluationInput", () => {
  it("renders labels, selects an existing non-zero-alpha value, and emits alpha zero", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithProviders(
      <Linguistic2TupleEvaluationInput
        expressionDomain={domain}
        value={{ labelKey: "high", alpha: -0.27 }}
        onChange={onChange}
      />
    );

    expect(screen.getByDisplayValue("high")).toBeInTheDocument();
    expect(screen.queryByLabelText(/alpha/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "Very Low" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Low" }));

    expect(onChange).toHaveBeenCalledWith({ labelKey: "low", alpha: 0 });
  });
});

describe("Linguistic2TupleCreationForm", () => {
  it("creates a three-label draft with the type key, unique keys, indexes, and odd-cardinality guidance", async () => {
    const user = userEvent.setup();

    renderWithProviders(<FormHarness />);

    expect(screen.getByDisplayValue("Low")).toBeInTheDocument();
    expect(screen.getByText(/odd number of ordered labels: 3, 5, 7/i)).toBeInTheDocument();

    const firstLabel = screen.getAllByLabelText("Label")[0];
    await user.clear(firstLabel);
    await user.type(firstLabel, "Very Low");

    const draft = JSON.parse(screen.getByTestId("two-tuple-draft").textContent);
    expect(draft.typeKey).toBe("linguistic2Tuple");
    expect(draft.definition.labels).toEqual([
      { key: "low", label: "Very Low", index: 0 },
      { key: "medium", label: "Medium", index: 1 },
      { key: "high", label: "High", index: 2 },
    ]);

    await user.click(screen.getByRole("button", { name: "Add label" }));
    expect(JSON.parse(screen.getByTestId("two-tuple-draft").textContent).definition.labels)
      .toEqual(expect.arrayContaining([{ key: "label_4", label: "Label 4", index: 3 }]));
  });
});
