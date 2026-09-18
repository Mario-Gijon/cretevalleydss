import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FinishedIssuesCards from "../../../src/features/finishedIssues/components/FinishedIssuesCards.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const issue = (overrides = {}) => ({
  id: "finished-issue-1",
  name: "Finished alternatives",
  description: "A completed decision.",
  creationDate: "10/01/2026",
  closureDate: "12/01/2026",
  finishedAt: "2026-01-15T10:00:00.000Z",
  isIssueOwner: true,
  topAlternatives: [
    { alternativeId: "alternative-1", name: "First alternative", rank: 1, score: 0.9 },
    { alternativeId: "alternative-2", name: "Second alternative", rank: 2, score: 0.6 },
    { alternativeId: "alternative-3", name: "Third alternative", rank: 3, score: 0.2 },
  ],
  ...overrides,
});

const renderCards = ({ issues = [issue()], onOpenDetails = vi.fn() } = {}) => {
  renderWithProviders(
    <FinishedIssuesCards
      issues={issues}
      isLgUp
      isMobile={false}
      onOpenDetails={onOpenDetails}
    />
  );

  return onOpenDetails;
};

describe("FinishedIssuesCards", () => {
  it("renders the compact Top alternatives summary from the list payload", () => {
    renderCards();

    const ranking = screen.getByRole("region", { name: "Top alternatives" });

    expect(within(ranking).getByText("Top alternatives")).toBeInTheDocument();
    expect(within(ranking).getAllByRole("listitem")).toHaveLength(3);
    expect(within(ranking).getByText("#1")).toBeInTheDocument();
    expect(within(ranking).getByText("#2")).toBeInTheDocument();
    expect(within(ranking).getByText("#3")).toBeInTheDocument();
    expect(within(ranking).getByText("First alternative")).toBeInTheDocument();
    expect(within(ranking).getByText("Second alternative")).toBeInTheDocument();
    expect(within(ranking).getByText("Third alternative")).toBeInTheDocument();
    expect(within(ranking).getAllByText("#1")).toHaveLength(1);
    expect(within(ranking).getAllByText("#2")).toHaveLength(1);
    expect(within(ranking).getAllByText("#3")).toHaveLength(1);
    expect(within(ranking).queryByTestId("top-alternative-bar-1")).toBeNull();
    expect(within(ranking).queryByTestId("top-alternative-bar-2")).toBeNull();
    expect(within(ranking).queryByTestId("top-alternative-bar-3")).toBeNull();
  });

  it("renders available entries only when fewer than three alternatives exist", () => {
    renderCards({
      issues: [issue({
        topAlternatives: [
          { alternativeId: "alternative-1", name: "Only alternative", rank: 1, score: 0.4 },
        ],
      })],
    });

    const ranking = screen.getByRole("region", { name: "Top alternatives" });

    expect(within(ranking).getAllByRole("listitem")).toHaveLength(1);
    expect(within(ranking).getByText("Only alternative")).toBeInTheDocument();
    expect(within(ranking).queryByText("#2")).not.toBeInTheDocument();
  });

  it("keeps the card compact when no ranking is available", () => {
    renderCards({ issues: [issue({ topAlternatives: [] })] });

    expect(
      within(screen.getByRole("region", { name: "Top alternatives" })).getByText(
        "Ranking unavailable"
      )
    ).toBeInTheDocument();
  });

  it("uses a reserved two-line description area and a compact metadata footer", () => {
    renderCards();

    const description = screen.getByTestId("finished-issue-description");
    const footer = screen.getByTestId("finished-issue-footer");

    expect(description).toHaveStyle({ minHeight: "42px" });
    expect(within(footer).getByText("Created")).toBeInTheDocument();
    expect(within(footer).getByText("Expected finish")).toBeInTheDocument();
    expect(within(footer).getByText("Finished")).toBeInTheDocument();
    expect(within(footer).getByText("10/01/2026")).toBeInTheDocument();
    expect(within(footer).getByText("12/01/2026")).toBeInTheDocument();
    expect(screen.getAllByText("Finished")).toHaveLength(1);
  });

  it("uses a quiet placeholder for missing expected and completed dates", () => {
    renderCards({ issues: [issue({ closureDate: null, finishedAt: null })] });

    expect(
      within(screen.getByTestId("finished-issue-footer")).getAllByText("—")
    ).toHaveLength(2);
  });

  it("does not render score bars even when score data is present", () => {
    renderCards();

    const ranking = screen.getByRole("region", { name: "Top alternatives" });
    expect(ranking.querySelector('[data-testid^="top-alternative-bar-"]')).toBeNull();
  });

  it("renders long alternative names without changing card interaction", () => {
    const onOpenDetails = renderCards({
      issues: [issue({
        topAlternatives: [{
          alternativeId: "alternative-long",
          name: "A very long alternative name that remains available through the card tooltip",
          rank: 1,
          score: 0.8,
        }],
      })],
    });

    expect(screen.getByText("A very long alternative name that remains available through the card tooltip"))
      .toBeInTheDocument();

    fireEvent.click(screen.getByText("Finished alternatives"));
    expect(onOpenDetails).toHaveBeenCalledWith(expect.objectContaining({
      id: "finished-issue-1",
    }));
  });

  it("keeps the full long description available through its title attribute", () => {
    const description = "A deliberately long description that should remain available even when the card clamps it to two lines.";

    renderCards({ issues: [issue({ description })] });

    expect(screen.getByTestId("finished-issue-description")).toHaveAttribute(
      "title",
      description
    );
  });
});
