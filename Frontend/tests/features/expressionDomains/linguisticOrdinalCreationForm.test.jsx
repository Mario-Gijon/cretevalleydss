import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
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

const TwoLabelOrdinalFormHarness = () => {
  const [value, setValue] = useState({
    name: "",
    typeKey: "linguisticOrdinal",
    definition: {
      labels: [
        { key: "low", label: "Low", index: 0 },
        { key: "high", label: "High", index: 1 },
      ],
    },
  });

  return <LinguisticOrdinalCreationForm value={value} onChange={setValue} />;
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

  it("uses list semantics and transition wrappers for animated row changes", () => {
    renderWithProviders(<OrdinalFormHarness />);

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(document.querySelectorAll(".MuiCollapse-root").length).toBe(3);
  });

  it("appends a new label after High and deletes the correct row while preserving minimum-two rule", async () => {
    const user = userEvent.setup();

    const { unmount } = renderWithProviders(<OrdinalFormHarness />);

    await user.click(screen.getByRole("button", { name: "Add label" }));

    expect(screen.getByText("4th label")).toBeInTheDocument();
    const draftAfterAdd = JSON.parse(screen.getByTestId("ordinal-draft").textContent);
    expect(draftAfterAdd.definition.labels.map((label) => label.index)).toEqual([0, 1, 2, 3]);
    expect(draftAfterAdd.definition.labels[3].label).toBe("Label 4");

    const listItems = screen.getAllByRole("listitem");
    await user.click(within(listItems[1]).getByRole("button"));

    const draftAfterDelete = JSON.parse(screen.getByTestId("ordinal-draft").textContent);
    expect(draftAfterDelete.definition.labels).toEqual([
      { key: "low", label: "Low", index: 0 },
      { key: "high", label: "High", index: 1 },
      { key: "label_4", label: "Label 4", index: 2 },
    ]);

    unmount();
    renderWithProviders(<TwoLabelOrdinalFormHarness />);
    screen.getAllByRole("listitem").forEach((item) => {
      expect(within(item).getByRole("button")).toBeDisabled();
    });
  });

  it("allows uninterrupted typing of long labels with spaces and keeps canonical zero-based indexes", async () => {
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
