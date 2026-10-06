import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-chartjs-2", () => ({
  Doughnut: ({ data }) => <div data-testid="participation-chart">{data.datasets[0].data.join(",")}</div>,
}));

import OverviewView from "../../../../../src/features/finishedIssueDialog/sections/overview/components/OverviewView";
import { buildOverviewData } from "../../../../../src/features/finishedIssueDialog/sections/overview/logic/buildFinishedIssueOverviewData.js";
import {
  issueInfoColumnsSx,
  issueInfoParticipationGridSx,
  issueInfoSharedViewportSx,
  issueInfoExpertTableViewportSx,
  overviewExpertDetailsSx,
  overviewDataRowSeparator,
  issueInfoTableViewportSx,
  issueDescriptionItemSx,
} from "../../../../../src/features/finishedIssueDialog/sections/overview/overview.styles.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const renderView = (data) => render(
  <ThemeProvider theme={createTheme()}><OverviewView data={data} /></ThemeProvider>
);

const dataFor = (payload = buildFinishedIssuePayloadFixture(), rows = []) => ({
  ...buildOverviewData(payload),
  expertParticipation: { rows },
});

describe("Issue info view", () => {
  it("renders the four panels in the intended structure and only configuration fields", () => {
    renderView(dataFor());
    ["Issue information", "Alternatives", "Expert participation", "Criteria structure"].forEach((title) => {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    });
    ["Evaluation model", "Alternative evaluation", "Criteria weighting", "Weighting level", "Created", "Finalized", "Description"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.queryByText("Domain assignments")).not.toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
    expect(screen.getByText("Base model")).toBeInTheDocument();
    expect(screen.getByText("Canonical fixture")).toBeInTheDocument();
    expect(screen.getByTestId("participation-chart")).toHaveTextContent("1,1");
    expect(issueDescriptionItemSx).toMatchObject({ gridColumn: "1 / -1", alignItems: "flex-start" });
    expect(screen.getByTestId("issue-description-item")).toHaveTextContent("DescriptionCanonical fixture");
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(screen.queryByText("Consensus")).not.toBeInTheDocument();
    expect(screen.queryByText("Expected finalization date")).not.toBeInTheDocument();
  });

  it("formats day-first Created and ISO Finalized dates as MMM D, YYYY without changing raw values", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.lifecycle.creationDate = "23-09-2026";
    payload.lifecycle.finishedAt = "2026-09-23T15:30:00.000Z";
    const data = dataFor(payload);
    renderView(data);
    expect(screen.getAllByText("Sep 23, 2026")).toHaveLength(2);
    expect(data.general.creationDate).toBe("23-09-2026");
    expect(data.general.finishedAt).toBe("2026-09-23T15:30:00.000Z");
  });

  it("renders alternative names and descriptions while omitting missing descriptions", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.alternatives = [
      { id: "a", name: "Named option", description: "A clear explanation." },
      { id: "b", name: "Name only" },
    ];
    renderView(dataFor(payload));
    expect(screen.getByText("Named option")).toBeInTheDocument();
    expect(screen.getByText("A clear explanation.")).toBeInTheDocument();
    expect(screen.getByText("Name only")).toBeInTheDocument();
  });

  it("keeps compact status icons and allows full-process and other rows to expand into ordered details", async () => {
    renderView(dataFor(undefined, [
      { expertId: "full", name: "Full Expert", participationLabel: "Full process", invitation: { status: "accepted", respondedAt: "2026-01-01T00:00:00Z" }, criteriaWeighting: { completed: 1, total: 1 }, alternativeEvaluation: { completed: 1, total: 1 }, events: [
        { type: "invitationAccepted", occurredAt: "2026-01-01T00:00:00Z" },
        { type: "entered", stage: "criteriaWeighting", phase: 1, occurredAt: "2026-01-01T00:01:00Z" },
      ] },
      { expertId: "partial", name: "Partial Expert", participationLabel: "Removed during alternative evaluation", invitation: { status: "pending" }, criteriaWeighting: { completed: 1, total: 2, submissions: [{ phase: 1, completed: true, submittedAt: "2026-01-01T00:00:00Z" }] }, alternativeEvaluation: { completed: 0, total: 2, submissions: [] }, events: [
        { type: "invitationAccepted", occurredAt: "2025-12-31T00:00:00Z" },
        { type: "entered", stage: "criteriaWeighting", phase: 1, occurredAt: "2026-01-01T00:00:00Z" },
        { type: "removed", stage: "alternativeEvaluation", phase: 2, occurredAt: "2026-01-02T00:00:00Z" },
      ] },
    ]));
    expect(screen.getByText("Full Expert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand Full Expert details" })).toBeInTheDocument();
    expect(screen.getByLabelText("Accepted")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Completed")).toHaveLength(2);
    expect(screen.getByLabelText("Not submitted")).toBeInTheDocument();
    expect(screen.getByText("Full process").closest(".MuiChip-root")).toBeNull();
    expect(screen.getByText("Removed during alternative evaluation")).toBeInTheDocument();
    expect(screen.getByTestId("overview-participant-list")).not.toHaveTextContent(/Jan 1, 2026/);
    const fullRow = screen.getByRole("row", { name: "Toggle details for Full Expert" });
    fireEvent.click(fullRow);
    const fullDetails = screen.getByTestId("expert-detail-area");
    expect(fullDetails).toHaveTextContent("Submission summary");
    expect(fullDetails).toHaveTextContent("InvitationStatus: Accepted");
    expect(fullDetails).toHaveTextContent("Criteria weightingStatus: Submitted");
    expect(fullDetails).toHaveTextContent("Alternative evaluationStatus: Submitted");
    expect(within(fullDetails).queryByText("Participation history")).not.toBeInTheDocument();
    fireEvent.click(within(fullDetails).getByText("Status: Accepted"));
    expect(fullRow).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(fullRow);
    expect(fullRow).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.queryByTestId("expert-detail-area")).not.toBeInTheDocument());
    const partialRow = screen.getByRole("row", { name: "Toggle details for Partial Expert" });
    fireEvent.click(partialRow);
    expect(screen.getAllByText("Criteria weighting").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Alternative evaluation").length).toBeGreaterThan(1);
    const partialDetails = screen.getByTestId("expert-detail-area");
    expect(partialDetails).toHaveTextContent("Status: Partially submitted");
    expect(partialDetails).toHaveTextContent("Status: Not submitted");
    expect(partialDetails).toHaveTextContent(/Date: Jan 1, 2026/);
    expect(within(partialDetails).getByText("Participation history")).toBeInTheDocument();
    const history = within(partialDetails).getByText("Participation history").parentElement;
    expect(history).toHaveTextContent("Removed during alternative evaluation · Round 2");
    expect(history).not.toHaveTextContent("Invitation accepted");
    expect(history).not.toHaveTextContent("Joined during criteria weighting");
    const summary = partialDetails.querySelector("[data-testid='expert-submission-summary']");
    expect(summary.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders criteria in one hierarchical table with inline descriptions and collapsible parents", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.criteria.nodes[0].description = "A parent criterion explanation.";
    payload.criteria.nodes[1].description = "A leaf explanation that may be longer than the visible row and remains available from its tooltip.";
    renderView(dataFor(payload));
    expect(screen.getByRole("table", { name: "Criteria structure" })).toBeInTheDocument();
    expect(screen.getByText("Criterion")).toBeInTheDocument();
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.queryByText("Domain")).not.toBeInTheDocument();
    expect(screen.queryByText("# Subcriteria")).not.toBeInTheDocument();
    expect(screen.getByText("A parent criterion explanation.")).toBeInTheDocument();
    expect(screen.getByText(/A leaf explanation that may be longer/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse Overall" }));
    expect(screen.queryByText("Cost", { selector: "p" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand Overall" }));
    expect(screen.getByText("Cost")).toBeInTheDocument();
  });

  it("contains responsive panel and table overflow within their own viewports", () => {
    expect(issueInfoColumnsSx.gridTemplateColumns).toEqual({ xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" });
    expect(issueInfoParticipationGridSx.gridTemplateColumns).toEqual({ xs: "minmax(0, 1fr)", md: "190px minmax(0, 1fr)" });
    expect(issueInfoSharedViewportSx).toMatchObject({ overflowY: "auto", overflowX: "hidden", minHeight: 0, maxHeight: { xs: 360, lg: 320, xl: 360 } });
    expect(issueInfoTableViewportSx).toMatchObject({ overflow: "auto", width: "100%", minWidth: 0 });
    expect(issueInfoExpertTableViewportSx).toMatchObject({ overflow: "auto", width: "100%", minWidth: 0 });
    expect(overviewExpertDetailsSx).toMatchObject({ bgcolor: "rgba(255,255,255,0.012)" });
    expect(overviewExpertDetailsSx.border).toBeUndefined();
    expect(overviewExpertDetailsSx.borderTop).toBeUndefined();
    expect(overviewDataRowSeparator).toBe("1px solid rgba(85, 199, 216, 0.10)");
  });
});
