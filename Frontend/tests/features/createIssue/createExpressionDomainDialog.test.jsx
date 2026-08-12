import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../src/components/FuzzyPreviewChart/FuzzyPreviewChart.jsx",
  () => ({
    FuzzyPreviewChart: ({ height }) => (
      <div data-testid="fuzzy-preview-chart" data-height={JSON.stringify(height)} />
    ),
  })
);

import { CreateExpressionDomainDialog } from "../../../src/features/createIssue/expressionDomains/components/CreateExpressionDomainDialog.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("CreateExpressionDomainDialog", () => {
  it("renders grouped type selection above the form without a Selected chip", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <CreateExpressionDomainDialog open onClose={vi.fn()} onCreated={vi.fn()} />
    );

    expect(screen.getByText("Select domain type")).toBeInTheDocument();
    expect(screen.getByText("Numeric domains")).toBeInTheDocument();
    expect(screen.getByText("Linguistic domains")).toBeInTheDocument();
    expect(screen.queryByText("Selected")).not.toBeInTheDocument();

    const numericGroup = screen.getByText("Numeric domains").closest("div");
    const linguisticGroup = screen.getByText("Linguistic domains").closest("div");

    expect(within(numericGroup).getByText("Numeric continuous")).toBeInTheDocument();
    expect(within(numericGroup).getByText("Numeric discrete")).toBeInTheDocument();
    expect(within(linguisticGroup).getByText("Ordered linguistic")).toBeInTheDocument();
    expect(within(linguisticGroup).getByText("Linguistic 2-Tuple")).toBeInTheDocument();
    expect(within(linguisticGroup).getByText("Fuzzy linguistic")).toBeInTheDocument();

    const linguisticTypeLabels = within(linguisticGroup)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(linguisticTypeLabels).toEqual([
      expect.stringContaining("Ordered linguistic"),
      expect.stringContaining("Linguistic 2-Tuple"),
      expect.stringContaining("Fuzzy linguistic"),
    ]);

    await user.click(
      screen.getByText("Ordered linguistic").closest('[role="button"]')
    );

    expect(screen.getByText("1st label")).toBeInTheDocument();
    expect(screen.getByTestId("expression-domain-type-selector").compareDocumentPosition(
      screen.getByTestId("expression-domain-selected-form")
    ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders the registered linguistic 2-tuple creation form when selected", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <CreateExpressionDomainDialog open onClose={vi.fn()} onCreated={vi.fn()} />
    );

    await user.click(
      screen.getByText("Linguistic 2-Tuple").closest('[role="button"]')
    );

    expect(
      screen.getByText(
        "A linguistic 2-tuple term set must contain an odd number of ordered labels: 3, 5, 7, …"
      )
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("Label")).toHaveLength(3);
  });

  it("does not remount the selected form or lose focus while typing", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <CreateExpressionDomainDialog open onClose={vi.fn()} onCreated={vi.fn()} />
    );

    await user.click(
      screen.getByText("Ordered linguistic").closest('[role="button"]')
    );

    const firstLabelInput = screen.getAllByLabelText("Label")[0];
    await user.clear(firstLabelInput);
    await user.type(firstLabelInput, "Preference");

    expect(firstLabelInput).toHaveFocus();
    expect(firstLabelInput).toHaveValue("Preference");
  });

  it("keeps the selected numeric form below the selector when changing types", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <CreateExpressionDomainDialog open onClose={vi.fn()} onCreated={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: /numeric discrete/i }));

    expect(screen.getByLabelText("Step")).toBeInTheDocument();
    expect(screen.getByTestId("expression-domain-type-selector").compareDocumentPosition(
      screen.getByTestId("expression-domain-selected-form")
    ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses outlined icon buttons for the primary and cancel dialog actions", () => {
    renderWithProviders(
      <CreateExpressionDomainDialog open onClose={vi.fn()} onCreated={vi.fn()} />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    const primaryButton = screen.getByRole("button", { name: /create domain/i });

    expect(cancelButton.className).toContain("MuiButton-outlined");
    expect(primaryButton.className).toContain("MuiButton-outlined");
    expect(cancelButton.querySelector("svg")).not.toBeNull();
    expect(primaryButton.querySelector("svg")).not.toBeNull();
  });
});
