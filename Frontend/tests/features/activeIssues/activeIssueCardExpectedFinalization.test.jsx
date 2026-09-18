import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ActiveIssueCard from "../../../src/features/activeIssues/components/ActiveIssueCard.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const pastExpectedFinalizationIssue = {
  id: "issue-1",
  name: "Active issue with a past estimate",
  description: "The workflow remains active.",
  closureDate: "01-01-2000",
  currentStage: "alternativeEvaluation",
  isIssueOwner: false,
  isConsensus: true,
  statusFlags: { canEvaluateAlternatives: true },
  ui: {
    deadline: {
      hasDeadline: true,
      daysLeft: -1,
      iso: "2000-01-01T00:00:00.000Z",
    },
    statusKey: "evaluateAlternatives",
    statusLabel: "Evaluate alternatives",
    workflowSteps: [],
    hasAlternativeConsensus: false,
    hasCriteriaWeighting: false,
  },
};

describe("ActiveIssueCard expected finalization", () => {
  it("presents a past estimate without expiration or countdown language", () => {
    renderWithProviders(
      <ActiveIssueCard issue={pastExpectedFinalizationIssue} onOpenIssue={vi.fn()} />
    );

    expect(screen.getByText("Expected finalization", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("01-01-2000", { exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Expected finalization progress" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Expired", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/day\(s\) left/i)).not.toBeInTheDocument();
  });

  it("does not render an expected-finalization line when no date is configured", () => {
    renderWithProviders(
      <ActiveIssueCard
        issue={{
          ...pastExpectedFinalizationIssue,
          closureDate: null,
          ui: {
            ...pastExpectedFinalizationIssue.ui,
            deadline: { hasDeadline: false },
          },
        }}
        onOpenIssue={vi.fn()}
      />
    );

    expect(screen.getByText("No expected finalization date")).toBeInTheDocument();
    expect(
      screen.queryByRole("progressbar", { name: "Expected finalization progress" })
    ).not.toBeInTheDocument();
  });
});
