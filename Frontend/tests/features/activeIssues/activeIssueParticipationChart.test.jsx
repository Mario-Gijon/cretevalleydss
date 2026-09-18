import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-chartjs-2", () => ({
  Doughnut: ({ data }) => (
    <div
      data-testid="participation-doughnut"
      data-colors={JSON.stringify(data.datasets[0].backgroundColor)}
      data-values={JSON.stringify(data.datasets[0].data)}
    />
  ),
}));

import ActiveIssueParticipationChart from "../../../src/features/activeIssues/components/drawer/ActiveIssueParticipationChart.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("ActiveIssueParticipationChart", () => {
  it("uses the participation summary semantic colors in donut order", () => {
    renderWithProviders(
      <ActiveIssueParticipationChart
        total={7}
        participated={3}
        notEvaluated={2}
        pending={1}
        declined={1}
      />
    );

    const chart = screen.getByTestId("participation-doughnut");

    expect(JSON.parse(chart.dataset.colors)).toEqual([
      "#2e7d32",
      "#0288d1",
      "#ed6c02",
      "#d32f2f",
    ]);
    expect(JSON.parse(chart.dataset.values)).toEqual([3, 2, 1, 1]);
  });

  it("keeps zero-value categories safe in the dataset", () => {
    renderWithProviders(
      <ActiveIssueParticipationChart
        total={2}
        participated={2}
        notEvaluated={0}
        pending={0}
        declined={0}
      />
    );

    expect(JSON.parse(screen.getByTestId("participation-doughnut").dataset.values)).toEqual([
      2,
      0,
      0,
      0,
    ]);
  });
});
