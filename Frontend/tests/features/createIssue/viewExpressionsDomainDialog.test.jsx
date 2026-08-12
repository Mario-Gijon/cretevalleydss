import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../src/components/FuzzyPreviewChart/FuzzyPreviewChart.jsx",
  () => ({
    FuzzyPreviewChart: ({ height }) => (
      <div data-testid="fuzzy-preview-chart" data-height={JSON.stringify(height)} />
    ),
  })
);

import { ViewExpressionsDomainDialog } from "../../../src/features/createIssue/expressionDomains/components/ViewExpressionsDomainDialog.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const globalDomainFixture = {
  _id: "global-domain-1",
  name: "Global numeric domain",
  isGlobal: true,
  user: null,
  typeKey: "numericContinuous",
  definition: {
    min: 0,
    max: 10,
  },
};

const userDomainFixture = {
  _id: "user-domain-1",
  name: "My discrete domain",
  isGlobal: false,
  user: "user-1",
  typeKey: "numericDiscrete",
  definition: {
    min: 1,
    max: 5,
    step: 1,
  },
};

const largeDiscreteDomainFixture = {
  _id: "user-domain-2",
  name: "Extended discrete domain",
  isGlobal: false,
  user: "user-1",
  typeKey: "numericDiscrete",
  definition: {
    min: 0,
    max: 10,
    step: 1,
  },
};

const ordinalDomainFixture = {
  _id: "ordinal-domain-1",
  name: "Priority scale",
  isGlobal: false,
  user: "user-1",
  typeKey: "linguisticOrdinal",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "medium", label: "Medium", index: 1 },
      { key: "high", label: "High", index: 2 },
    ],
  },
};

const fuzzyDomainFixture = {
  _id: "fuzzy-domain-1",
  name: "Fuzzy suitability",
  isGlobal: false,
  user: "user-1",
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labelCount: 3,
    labels: [
      { key: "low", label: "Low", values: [0, 0, 0.5], index: 0 },
      { key: "medium", label: "Medium", values: [0, 0.5, 1], index: 1 },
      { key: "high", label: "High", values: [0.5, 1, 1], index: 2 },
    ],
  },
};

const twoTupleDomainFixture = {
  _id: "two-tuple-domain-1",
  name: "Fine preference scale",
  isGlobal: false,
  user: "user-1",
  typeKey: "linguistic2Tuple",
  definition: {
    labelCount: 5,
    labels: [
      { key: "very_low", label: "Very Low", index: 0 },
      { key: "low", label: "Low", index: 1 },
      { key: "medium", label: "Medium", index: 2 },
      { key: "high", label: "High", index: 3 },
      { key: "very_high", label: "Very High", index: 4 },
    ],
  },
};

const allDomainFixtures = [
  globalDomainFixture,
  userDomainFixture,
  ordinalDomainFixture,
  twoTupleDomainFixture,
  fuzzyDomainFixture,
  largeDiscreteDomainFixture,
];
const totalDomainCount = allDomainFixtures.length;

describe("ViewExpressionsDomainDialog", () => {
  it("shows compact filtering controls and renders numeric and linguistic family columns", async () => {
    const handleOpenEdit = vi.fn();
    const handleDelete = vi.fn();

    renderWithProviders(
      <ViewExpressionsDomainDialog
        open
        onClose={vi.fn()}
        handleOpenEdit={handleOpenEdit}
        handleDelete={handleDelete}
      />,
      {
        issuesValue: {
          globalDomains: [globalDomainFixture],
          expressionDomains: [
            userDomainFixture,
            ordinalDomainFixture,
            twoTupleDomainFixture,
            fuzzyDomainFixture,
            largeDiscreteDomainFixture,
          ],
        },
      }
    );

    expect(await screen.findByText("Manage domain expressions")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search domains by name")).toBeInTheDocument();
    expect(screen.getByLabelText("Family")).toBeInTheDocument();
    expect(screen.getByText("Global numeric domain")).toBeInTheDocument();
    expect(screen.getByText("My discrete domain")).toBeInTheDocument();
    expect(screen.queryByText(/Family:/)).not.toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.queryByText("Mine")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit domain" })).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "Delete domain" })).toHaveLength(5);

    expect(screen.getByTestId("expression-domain-family-layout")).toBeInTheDocument();
    expect(screen.getByTestId("expression-domain-numeric-column")).toBeInTheDocument();
    expect(screen.getByTestId("expression-domain-linguistic-column")).toBeInTheDocument();

    const numericNames = within(screen.getByTestId("expression-domain-numeric-column"))
      .getAllByRole("heading", { level: 6 })
      .map((item) => item.textContent);
    const linguisticNames = within(screen.getByTestId("expression-domain-linguistic-column"))
      .getAllByRole("heading", { level: 6 })
      .map((item) => item.textContent);

    expect(numericNames).toEqual([
      "Global numeric domain",
      "My discrete domain",
      "Extended discrete domain",
    ]);
    expect(linguisticNames).toEqual([
      "Priority scale",
      "Fine preference scale",
      "Fuzzy suitability",
    ]);
    expect(
      screen.getByText(`${totalDomainCount} of ${totalDomainCount} domains`)
    ).toBeInTheDocument();
  });

  it("does not auto-close when only global domains are available", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <ViewExpressionsDomainDialog
        open
        onClose={onClose}
        handleOpenEdit={vi.fn()}
        handleDelete={vi.fn()}
      />,
      {
        issuesValue: {
          globalDomains: [globalDomainFixture],
          expressionDomains: [],
        },
      }
    );

    expect(await screen.findByText("Global numeric domain")).toBeInTheDocument();

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it("filters domains into the correct family-only layouts and keeps the dialog open for no-match states", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ViewExpressionsDomainDialog
        open
        onClose={vi.fn()}
        handleOpenEdit={vi.fn()}
        handleDelete={vi.fn()}
      />,
      {
        issuesValue: {
          globalDomains: [globalDomainFixture],
          expressionDomains: [
            userDomainFixture,
            ordinalDomainFixture,
            twoTupleDomainFixture,
            fuzzyDomainFixture,
            largeDiscreteDomainFixture,
          ],
        },
      }
    );

    expect(await screen.findByText("Manage domain expressions")).toBeInTheDocument();
    expect(screen.queryByLabelText("Subtype")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Family"));
    await user.click(screen.getByRole("option", { name: "Numeric" }));

    expect(screen.getByLabelText("Subtype")).toBeInTheDocument();
    expect(screen.getByText(`3 of ${totalDomainCount} domains`)).toBeInTheDocument();
    expect(screen.queryByText("Priority scale")).not.toBeInTheDocument();
    expect(screen.queryByText("Fuzzy suitability")).not.toBeInTheDocument();
    expect(screen.getByTestId("expression-domain-numeric-only-layout")).toBeInTheDocument();
    expect(screen.queryByTestId("expression-domain-family-layout")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Subtype"));
    await user.click(screen.getByRole("option", { name: "Discrete" }));

    const filteredNames = within(screen.getByTestId("expression-domain-numeric-only-layout"))
      .getAllByRole("heading", { level: 6 })
      .map((item) => item.textContent);
    expect(filteredNames).toEqual(["My discrete domain", "Extended discrete domain"]);

    await user.click(screen.getByLabelText("Family"));
    await user.click(screen.getByRole("option", { name: "Linguistic" }));
    expect(screen.getByLabelText("Subtype")).toHaveTextContent("All linguistic");
    await user.click(screen.getByLabelText("Subtype"));
    expect(screen.getByRole("option", { name: "2-Tuple" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "2-Tuple" }));
    expect(screen.getByText("Fine preference scale")).toBeInTheDocument();
    expect(screen.queryByText("Priority scale")).not.toBeInTheDocument();
    expect(screen.queryByText("Fuzzy suitability")).not.toBeInTheDocument();
    expect(screen.getByTestId("expression-domain-linguistic-only-layout")).toBeInTheDocument();
    expect(screen.queryByTestId("expression-domain-numeric-only-layout")).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search domains by name"), "missing");
    expect(screen.getByText("No expression domains match the current filters.")).toBeInTheDocument();
    expect(screen.getByText(`0 of ${totalDomainCount} domains`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("renders canonical previews, exact discrete summaries, and a bounded fuzzy chart", async () => {
    renderWithProviders(
      <ViewExpressionsDomainDialog
        open
        onClose={vi.fn()}
        handleOpenEdit={vi.fn()}
        handleDelete={vi.fn()}
      />,
      {
        issuesValue: {
          globalDomains: [globalDomainFixture],
          expressionDomains: [
            userDomainFixture,
            ordinalDomainFixture,
            twoTupleDomainFixture,
            fuzzyDomainFixture,
            largeDiscreteDomainFixture,
          ],
        },
      }
    );

    expect(await screen.findByText("Manage domain expressions")).toBeInTheDocument();
    expect(screen.getByText("1 · 2 · 3 · 4 · 5")).toBeInTheDocument();
    expect(screen.getByText("5 values")).toBeInTheDocument();
    expect(screen.getByText("0 · 1 · 2 · … · 8 · 9 · 10")).toBeInTheDocument();
    expect(screen.getByText("11 values")).toBeInTheDocument();
    expect(screen.queryByText("Continuous interval")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Min$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Max$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Step$/)).not.toBeInTheDocument();
    const ordinalPreview = screen.getAllByTestId("ordered-linguistic-preview")[0];
    expect(ordinalPreview).toHaveAttribute("data-mobile-direction", "column");
    expect(ordinalPreview).toHaveAttribute("data-desktop-direction", "row");
    expect(within(ordinalPreview).getByText("1:")).toBeInTheDocument();
    expect(within(ordinalPreview).getByText("2:")).toBeInTheDocument();
    expect(within(ordinalPreview).getByText("3:")).toBeInTheDocument();
    expect(within(ordinalPreview).getByText("Low")).toBeInTheDocument();
    expect(within(ordinalPreview).getByText("Medium")).toBeInTheDocument();
    expect(within(ordinalPreview).getByText("High")).toBeInTheDocument();
    expect(screen.getByTestId("fuzzy-preview-chart")).toBeInTheDocument();
    expect(screen.getByTestId("fuzzy-preview-chart")).toHaveAttribute(
      "data-height",
      JSON.stringify({ xs: 192, sm: 204, lg: 216 })
    );
    expect(screen.getByTestId("expression-domain-card-fuzzy")).toBeInTheDocument();
  });
});
