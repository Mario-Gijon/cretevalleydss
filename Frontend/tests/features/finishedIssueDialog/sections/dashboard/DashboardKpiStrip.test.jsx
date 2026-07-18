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
  it("renders exactly the three factual KPI metrics and omits result phase", () => {
    renderStrip({
      kpis: {
        winner: { name: "Alpha", formattedScore: "0.8" },
        consensus: { enabled: false, label: "Disabled" },
        phase: { label: "Phase 5" },
      },
    });

    expect(screen.getByText("Best option")).toBeInTheDocument();
    expect(screen.getByText("Top score")).toBeInTheDocument();
    expect(screen.getByText("Consensus")).toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
    expect(screen.queryByText("Evaluation coverage")).not.toBeInTheDocument();
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

  it("gives Best option more space while keeping the three KPI cards aligned", () => {
    expect(dashboardKpiStripSx.gridTemplateColumns).toEqual({
      xs: "minmax(0, 1fr)",
      sm: "minmax(0, 1.5fr) repeat(2, minmax(180px, 0.75fr))",
    });
    expect(dashboardKpiItemSx({ metricKey: "winner" }).gridColumn).toBeUndefined();
    expect(dashboardKpiItemSx({ metricKey: "winner" }).bgcolor).toBe("transparent");
  });
});
