import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FinishedIssuesCards from "../../../src/features/finishedIssues/components/FinishedIssuesCards.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const issue = (overrides = {}) => ({
  id: "finished-issue-1",
  name: "Finished alternatives",
  description: "A completed decision.",
  creationDate: "10/01/2026",
  closureDate: "12/01/2026",
  isIssueOwner: true,
  topAlternatives: [
    { alternativeId: "alternative-1", name: "First alternative", rank: 1 },
    { alternativeId: "alternative-2", name: "Second alternative", rank: 2 },
    { alternativeId: "alternative-3", name: "Third alternative", rank: 3 },
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

    expect(screen.getByText("Top alternatives")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("First alternative")).toBeInTheDocument();
    expect(screen.getByText("Second alternative")).toBeInTheDocument();
    expect(screen.getByText("Third alternative")).toBeInTheDocument();
  });

  it("renders available entries only when fewer than three alternatives exist", () => {
    renderCards({
      issues: [issue({
        topAlternatives: [
          { alternativeId: "alternative-1", name: "Only alternative", rank: 1 },
        ],
      })],
    });

    expect(screen.getByText("Only alternative")).toBeInTheDocument();
    expect(screen.queryByText("#2")).not.toBeInTheDocument();
  });

  it("keeps the card compact when no ranking is available", () => {
    renderCards({ issues: [issue({ topAlternatives: [] })] });

    expect(screen.getByText("Ranking unavailable")).toBeInTheDocument();
  });

  it("renders long alternative names without changing card interaction", () => {
    const onOpenDetails = renderCards({
      issues: [issue({
        topAlternatives: [{
          alternativeId: "alternative-long",
          name: "A very long alternative name that remains available through the card tooltip",
          rank: 1,
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
});
