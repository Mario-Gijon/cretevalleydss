import { screen, waitFor } from "@testing-library/react";
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

describe("ViewExpressionsDomainDialog", () => {
  it("shows global and user domains while only exposing edit and delete for user domains", async () => {
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
            fuzzyDomainFixture,
            largeDiscreteDomainFixture,
          ],
        },
      }
    );

    expect(await screen.findByText("Manage domain expressions")).toBeInTheDocument();
    expect(screen.getByText("Global numeric domain")).toBeInTheDocument();
    expect(screen.getByText("My discrete domain")).toBeInTheDocument();
    expect(screen.queryByText(/Family:/)).not.toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.queryByText("Mine")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(4);
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
            fuzzyDomainFixture,
            largeDiscreteDomainFixture,
          ],
        },
      }
    );

    expect(await screen.findByText("Manage domain expressions")).toBeInTheDocument();
    expect(screen.getAllByText("Min 0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Max 10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Step 1").length).toBeGreaterThan(0);
    expect(screen.getByText("1 · 2 · 3 · 4 · 5")).toBeInTheDocument();
    expect(screen.getByText("5 values · Step 1")).toBeInTheDocument();
    expect(screen.getByText("0 · 1 · 2 · … · 8 · 9 · 10")).toBeInTheDocument();
    expect(screen.getByText("11 values · Step 1")).toBeInTheDocument();
    expect(screen.queryByText("Discrete step sequence")).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByTestId("fuzzy-preview-chart")).toBeInTheDocument();
    expect(screen.getByTestId("fuzzy-preview-chart")).toHaveAttribute(
      "data-height",
      JSON.stringify({ xs: 216, sm: 248, md: 260 })
    );
    expect(screen.queryAllByText("Low")).toHaveLength(0);
    expect(screen.getByTestId("expression-domain-card-fuzzy")).toBeInTheDocument();
  });
});
