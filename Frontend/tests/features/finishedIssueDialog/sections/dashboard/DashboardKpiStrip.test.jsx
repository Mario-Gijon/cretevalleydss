import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardKpiStrip from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/DashboardKpiStrip.jsx";
import {
  dashboardKpiItemSx,
  dashboardKpiStripSx,
} from "../../../../../src/features/finishedIssueDialog/sections/dashboard/dashboard.styles.js";

const renderStrip = (props) => render(
  <ThemeProvider theme={createTheme()}>
    <DashboardKpiStrip {...props} />
  </ThemeProvider>
);

describe("DashboardKpiStrip", () => {
  it("renders exactly the four factual KPI metrics and omits result phase", () => {
    renderStrip({
      kpis: {
        winner: { name: "Alpha", formattedScore: "0.8" },
        evaluationCoverage: { completed: 3, total: 4, formattedPercentage: "75%" },
        consensus: { enabled: false, label: "Disabled" },
        phase: { label: "Phase 5" },
      },
    });

    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(screen.getByText("Top score")).toBeInTheDocument();
    expect(screen.getByText("Evaluation coverage")).toBeInTheDocument();
    expect(screen.getByText("Consensus")).toBeInTheDocument();
    expect(screen.queryByText("Result phase")).not.toBeInTheDocument();
    expect(screen.queryByText("Round")).not.toBeInTheDocument();
  });

  it("keeps enabled Consensus keyboard-accessible and clickable", () => {
    const onOpenConsensus = vi.fn();
    renderStrip({
      kpis: { consensus: { enabled: true, label: "Enabled" } },
      onOpenConsensus,
    });

    fireEvent.click(screen.getByRole("button", { name: "Consensus: Enabled" }));
    expect(onOpenConsensus).toHaveBeenCalledOnce();
  });

  it("uses primary Winner grid placement across responsive layouts", () => {
    expect(dashboardKpiStripSx.gridTemplateColumns).toEqual({
      xs: "minmax(0, 1fr)",
      sm: "repeat(3, minmax(0, 1fr))",
      lg: "repeat(5, minmax(0, 1fr))",
    });
    expect(dashboardKpiItemSx({ metricKey: "winner" }).gridColumn).toEqual({
      xs: "auto",
      sm: "1 / -1",
      lg: "span 2",
    });
    expect(dashboardKpiItemSx({ metricKey: "score" }).gridColumn).toBe("auto");
  });
});
