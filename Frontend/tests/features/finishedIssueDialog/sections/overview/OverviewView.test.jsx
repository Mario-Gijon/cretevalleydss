import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-chartjs-2", () => ({
  Doughnut: ({ data }) => <div data-testid="participation-chart">{data.datasets[0].data.join(",")}</div>,
}));

import OverviewView from "../../../../../src/features/finishedIssueDialog/sections/overview/components/OverviewView";
import { buildOverviewData, buildOverviewPreview } from "../../../../../src/features/finishedIssueDialog/sections/overview/logic/buildFinishedIssueOverviewData.js";
import {
  overviewCriteriaViewportSx,
  overviewDomainListSx,
  overviewParticipationListSx,
  overviewScrollableListSx,
} from "../../../../../src/features/finishedIssueDialog/sections/overview/overview.styles.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const renderView = (data) => render(
  <ThemeProvider theme={createTheme()}><OverviewView data={data} /></ThemeProvider>
);

describe("OverviewView", () => {
  it("renders the approved provider-free factual Overview composition", () => {
    renderView(buildOverviewData(buildFinishedIssuePayloadFixture()));

    expect(screen.getByRole("heading", { name: "Issue information" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alternatives" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Criteria structure" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Experts & participation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Configuration & domains" })).toBeInTheDocument();
    expect(screen.getByText("Finished issue")).toBeInTheDocument();
    expect(screen.getByText("Canonical fixture")).toBeInTheDocument();
    expect(screen.getByText("1/1 accepted experts completed")).toBeInTheDocument();
    expect(screen.getByTestId("participation-chart")).toHaveTextContent("1,0,0,1");

    ["Issue information", "Alternatives", "Criteria structure", "Experts & participation", "Configuration & domains"].forEach((title) => {
      const heading = screen.getByRole("heading", { name: title });
      expect(heading.previousElementSibling?.previousElementSibling).toBeNull();
    });
  });

  it("renders arbitrary-depth criteria, resolves weights and domains, and collapses parents", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.criteria = {
      rootIds: ["root"],
      finalWeights: { byCriterionId: { leaf: 0.625 } },
      nodes: [
        { id: "root", name: "Root", childIds: ["second"], isLeaf: false },
        { id: "second", name: "Second", parentId: "root", childIds: ["third"], isLeaf: false },
        { id: "third", name: "Third", parentId: "second", childIds: ["fourth"], isLeaf: false },
        { id: "fourth", name: "Fourth", parentId: "third", childIds: ["leaf"], isLeaf: false },
        { id: "leaf", name: "Leaf", parentId: "fourth", childIds: [], isLeaf: true, type: "cost", expressionDomainId: "domain-1" },
      ],
    };
    renderView(buildOverviewData(payload));

    expect(screen.getAllByText("Leaf").length).toBeGreaterThan(0);
    expect(screen.getByText("Cost")).toBeInTheDocument();
    expect(screen.getByText("Weight 0.625")).toBeInTheDocument();
    expect(screen.getAllByText("Crisp").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Collapse Root" }));
    expect(screen.getByRole("button", { name: "Expand Root" })).toBeInTheDocument();
  });

  it("handles malformed criteria and factual participation states without fabricated values", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.criteria = {
      rootIds: ["a"],
      nodes: [
        { id: "a", name: "A", parentId: null, childIds: ["b", "missing"], isLeaf: false },
        { id: "b", name: "B", parentId: "a", childIds: ["a"], isLeaf: false },
        { id: "orphan", name: "Orphan", parentId: "removed", childIds: [], isLeaf: true, type: "benefit" },
      ],
      finalWeights: { byCriterionId: {} },
    };
    payload.participants = [
      { id: "accepted-incomplete", expert: { id: "expert-a", name: "Accepted" }, invitationStatus: "accepted", evaluationCompleted: false },
      { id: "pending", expert: { id: "expert-p", name: "Pending" }, invitationStatus: "pending", evaluationCompleted: false },
      { id: "declined", expert: { id: "expert-d", name: "Declined" }, invitationStatus: "declined", evaluationCompleted: false },
    ];
    const data = buildOverviewData(payload);

    expect(data.criteria.map((criterion) => criterion.id)).toEqual(["a", "orphan"]);
    expect(data.participation).toMatchObject({ accepted: 1, completed: 0, pending: 1, declined: 1, completionPercentage: 0 });
    expect(buildOverviewPreview(data)).toMatchObject({ acceptedParticipantsCount: 1, completedAlternativeEvaluationsCount: 0 });
    renderView(data);
    expect(screen.getAllByText("Accepted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Declined").length).toBeGreaterThan(0);
  });

  it("uses the latest stored alternative-evaluation result and handles zero accepted participants", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.participants = [{ id: "pending", expert: { id: "expert-p", name: "Pending" }, invitationStatus: "pending", evaluationCompleted: false }];
    const data = buildOverviewData(payload);

    expect(data.evidence.resultId).toBe("alt-5");
    expect(data.participation.completionPercentage).toBeNull();
    renderView(data);
    expect(screen.getByText("No accepted participants")).toBeInTheDocument();
    expect(screen.getByText("alt-5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy result ID" })).toBeEnabled();
  });

  it("renders unbounded alternatives, participants, domains and deep criteria in internal viewports", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.alternatives = Array.from({ length: 12 }, (_, index) => ({
      id: `alternative-${index + 1}`,
      name: `Alternative ${index + 1}`,
      description: `Description ${index + 1}`,
      position: index + 1,
    }));
    payload.participants = Array.from({ length: 12 }, (_, index) => ({
      id: `participant-${index + 1}`,
      expert: { id: `expert-${index + 1}`, name: `Participant ${index + 1}`, email: `participant-${index + 1}@example.test` },
      invitationStatus: ["accepted", "pending", "declined"][index % 3],
      evaluationCompleted: index % 4 === 0,
    }));
    payload.expressionDomains = Array.from({ length: 10 }, (_, index) => ({ id: `domain-${index + 1}`, name: `Domain ${index + 1}`, typeKey: "crisp" }));
    payload.criteria = {
      rootIds: ["level-1"],
      finalWeights: { byCriterionId: { "level-6": 1 } },
      nodes: Array.from({ length: 6 }, (_, index) => ({
        id: `level-${index + 1}`,
        name: `Level ${index + 1}`,
        parentId: index ? `level-${index}` : null,
        childIds: index < 5 ? [`level-${index + 2}`] : [],
        isLeaf: index === 5,
        type: index === 5 ? "benefit" : null,
        expressionDomainId: index === 5 ? "domain-1" : null,
      })),
    };

    renderView(buildOverviewData(payload));

    for (let index = 1; index <= 12; index += 1) {
      expect(screen.getByText(`Alternative ${index}`)).toBeInTheDocument();
      expect(screen.getByText(`Participant ${index}`)).toBeInTheDocument();
    }
    for (let index = 1; index <= 10; index += 1) {
      expect(screen.getAllByText(`Domain ${index}`).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Level 6").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Alternatives" }).parentElement).toHaveTextContent("12");
    expect(screen.getByRole("heading", { name: "Experts & participation" }).parentElement).toHaveTextContent("12");
    expect(screen.getByTestId("overview-participant-list")).not.toContainElement(screen.getByTestId("overview-participation-chart"));
    expect(screen.getByTestId("overview-domain-list")).not.toContainElement(screen.getByText("Model", { exact: true }));

    expect(overviewScrollableListSx).toMatchObject({ overflowY: "auto", overflowX: "hidden", maxHeight: { xs: 360, md: 390, xl: 430 } });
    expect(overviewParticipationListSx).toMatchObject({ overflowY: "auto", overflowX: "hidden", maxHeight: { xs: 300, md: 330, xl: 370 } });
    expect(overviewDomainListSx).toMatchObject({ overflowY: "auto", overflowX: "hidden", maxHeight: { xs: 220, md: 250, xl: 290 } });
    expect(overviewCriteriaViewportSx).toMatchObject({ overflow: "auto", maxWidth: "100%", maxHeight: { xs: 420, md: 460, xl: 520 } });
  });
});
