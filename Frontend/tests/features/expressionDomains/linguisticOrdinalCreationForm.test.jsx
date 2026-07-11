import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import LinguisticOrdinalCreationForm from "../../../src/features/expressionDomains/types/linguisticOrdinal/LinguisticOrdinalCreationForm.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const OrdinalFormHarness = () => {
  const [value, setValue] = useState({
    name: "",
    typeKey: "linguisticOrdinal",
    definition: {},
  });

  return (
    <>
      <LinguisticOrdinalCreationForm value={value} onChange={setValue} />
      <pre data-testid="ordinal-draft">{JSON.stringify(value)}</pre>
    </>
  );
};

describe("LinguisticOrdinalCreationForm", () => {
  it("starts new drafts with Low, Medium, High and visible 1st/2nd/3rd labels", () => {
    renderWithProviders(<OrdinalFormHarness />);

    expect(screen.getByDisplayValue("Low")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Medium")).toBeInTheDocument();
    expect(screen.getByDisplayValue("High")).toBeInTheDocument();
    expect(screen.getByText("1st label")).toBeInTheDocument();
    expect(screen.getByText("2nd label")).toBeInTheDocument();
    expect(screen.getByText("3rd label")).toBeInTheDocument();
  });

  it("renders labels in top-to-bottom order and keeps each row on its own line", () => {
    renderWithProviders(<OrdinalFormHarness />);

    const firstOrderLabel = screen.getByText("1st label");
    const secondOrderLabel = screen.getByText("2nd label");
    const thirdOrderLabel = screen.getByText("3rd label");

    expect(firstOrderLabel.compareDocumentPosition(secondOrderLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secondOrderLabel.compareDocumentPosition(thirdOrderLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getAllByLabelText("Label")).toHaveLength(3);
    expect(screen.getAllByRole("button").some((button) => button.getAttribute("aria-label"))).toBe(false);
  });

  it("allows uninterrupted typing of long labels without losing focus and keeps canonical zero-based indexes", async () => {
    const user = userEvent.setup();

    renderWithProviders(<OrdinalFormHarness />);

    await user.click(screen.getByLabelText("Name"));
    const firstLabelInput = screen.getAllByLabelText("Label")[0];

    await user.clear(firstLabelInput);
    await user.type(firstLabelInput, "Strongly preferred alternative label");

    expect(firstLabelInput).toHaveFocus();
    expect(firstLabelInput).toHaveValue("Strongly preferred alternative label");

    const draft = JSON.parse(screen.getByTestId("ordinal-draft").textContent);
    expect(draft.definition.labels).toEqual([
      {
        key: "low",
        label: "Strongly preferred alternative label",
        index: 0,
      },
      { key: "medium", label: "Medium", index: 1 },
      { key: "high", label: "High", index: 2 },
    ]);
    expect(draft.definition.labels.every((label) => !("value" in label))).toBe(true);
  });
});
