import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../src/features/issueEvaluation/rendering/index.js", () => ({
  EvaluationStructureRenderer: (props) => <div data-testid={`evaluation-renderer-${props.stage}`} />,
}));

import EvaluationsView from "../../../../../src/features/finishedIssueDialog/sections/evaluations/components/EvaluationsView.jsx";
import { buildEvaluationsWorkspaceData } from "../../../../../src/features/finishedIssueDialog/sections/evaluations/logic/buildEvaluationsWorkspaceData.js";
import { buildAHPSortIGroupEvaluationPresentation } from "../../../../../src/features/finishedIssueDialog/sections/evaluations/logic/buildAHPSortIGroupEvaluationPresentation.js";
import { buildGAHPSortFinishedIssueFixture } from "../../../../mocks/fixtures/gahpsortFinishedIssue.fixture.js";

const selection = { selectedExpertId: "expert-a", showCollective: false };
const actions = { setSelectedExpertId: vi.fn(), setShowCollective: vi.fn() };

const renderView = (data, state) => render(
  <ThemeProvider theme={createTheme()}>
    <EvaluationsView data={data} state={state} actions={actions} />
  </ThemeProvider>
);

describe("GAHPSort collective evaluation in Finished Issues", () => {
  it("uses validated persisted group output and preserves the criteria-weighting collective", () => {
    const payload = buildGAHPSortFinishedIssueFixture();
    const data = buildEvaluationsWorkspaceData({ payload, selection, selectedPhase: 0 });

    expect(data.alternativeEvaluation.collectiveGroupPresentation).toMatchObject({ status: "available" });
    const rendered = renderView(data, selection);
    const alternativePanel = screen.getByTestId("evaluation-stage-panel-alternativeEvaluation");
    expect(within(alternativePanel).getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(within(alternativePanel).getByText("Performance of alternatives on each criterion.")).toBeInTheDocument();
    expect(screen.queryByTestId("gahpsort-collective-evaluation")).not.toBeInTheDocument();
    expect(screen.getByTestId("evaluation-renderer-alternativeEvaluation")).toBeInTheDocument();

    const collectiveState = { ...selection, showCollective: true };
    rendered.rerender(
      <ThemeProvider theme={createTheme()}>
        <EvaluationsView data={data} state={collectiveState} actions={actions} />
      </ThemeProvider>
    );

    expect(within(alternativePanel).getByRole("heading", { name: "Collective GAHPSort classification" })).toBeInTheDocument();
    expect(within(alternativePanel).getByText("Individual expert assignments, category votes and final group decisions.")).toBeInTheDocument();
    const table = screen.getByTestId("gahpsort-collective-evaluation");
    expect(window.getComputedStyle(table).overflowX).toBe("auto");
    expect(window.getComputedStyle(table).overflowY).toBe("hidden");
    expect(within(table).getByRole("columnheader", { name: "Alternative" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Expert A" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Expert B" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Expert C" })).toBeInTheDocument();
    const rows = within(table).getAllByTestId("gahpsort-collective-alternative-row");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("Spain");
    expect(rows[0]).toHaveTextContent("BadUnanimous · 3 votes");
    expect(rows[1]).toHaveTextContent("United Kingdom");
    expect(rows[1]).toHaveTextContent("GoodTie · more preferred category selected");
    expect(rows[1]).toHaveTextContent("Bad: 1");
    expect(rows[1]).toHaveTextContent("Moderate: 1");
    expect(rows[1]).toHaveTextContent("Good: 1");
    expect(rows[3]).toHaveTextContent("Norway");
    expect(rows[3]).toHaveTextContent("ModerateMajority · 2 of 3 votes");
    expect(rows[4]).toHaveTextContent("Romania");
    expect(rows[4]).toHaveTextContent("ModerateUnanimous · 3 votes");
    expect(table.textContent).not.toMatch(/expert-[a-z]|cat-(bad|moderate|good)|united-kingdom/);

    expect(data.criteriaWeighting.renderer).toMatchObject({
      collectiveEvaluation: expect.objectContaining({ weightsByCriterion: { "criterion-quality": 1 } }),
      readOnly: true,
    });
    expect(within(screen.getByTestId("evaluation-stage-panel-alternativeEvaluation")).queryByTestId("evaluation-renderer-alternativeEvaluation")).not.toBeInTheDocument();

    rendered.rerender(
      <ThemeProvider theme={createTheme()}>
        <EvaluationsView data={data} state={selection} actions={actions} />
      </ThemeProvider>
    );
    expect(within(alternativePanel).getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(within(alternativePanel).getByText("Performance of alternatives on each criterion.")).toBeInTheDocument();
    expect(screen.queryByTestId("gahpsort-collective-evaluation")).not.toBeInTheDocument();
    expect(screen.getByTestId("evaluation-renderer-alternativeEvaluation")).toBeInTheDocument();
  });

  it("applies the saved pessimistic preference only to a persisted vote tie", () => {
    const payload = buildGAHPSortFinishedIssueFixture({ tiePolicy: "pessimistic" });
    const presentation = buildAHPSortIGroupEvaluationPresentation({ payload, phase: 0 });
    const unitedKingdom = presentation.evidence.alternativesById["united-kingdom"];

    expect(presentation.status).toBe("available");
    expect(unitedKingdom).toMatchObject({
      category: { id: "cat-bad", label: "Bad" },
      aggregationStatus: "tied_plurality",
      tiePolicy: "pessimistic",
      votes: [
        { label: "Bad", count: 1 },
        { label: "Moderate", count: 1 },
        { label: "Good", count: 1 },
      ],
    });
  });

  it("hides all vote details when the persisted group evidence fails integrity validation", () => {
    const payload = buildGAHPSortFinishedIssueFixture();
    payload.phaseResults[0].standardizedOutput.diagnostics.resultsByAlternativeId.spain.votesByCategoryId["cat-bad"] = 99;
    const state = { ...selection, showCollective: true };
    const data = buildEvaluationsWorkspaceData({ payload, selection: state, selectedPhase: 0 });

    expect(data.alternativeEvaluation.collectiveGroupPresentation.status).toBe("integrity_warning");
    renderView(data, state);

    expect(screen.getByTestId("gahpsort-collective-integrity-warning")).toHaveTextContent("Vote details are hidden.");
    expect(screen.queryByTestId("gahpsort-collective-evaluation")).not.toBeInTheDocument();
    expect(screen.queryByText("Spain")).not.toBeInTheDocument();
  });

  it("explains when the saved sorting output is absent instead of falling back to a Saaty matrix", () => {
    const payload = buildGAHPSortFinishedIssueFixture();
    payload.phaseResults[0].standardizedOutput = null;
    const state = { ...selection, showCollective: true };
    const data = buildEvaluationsWorkspaceData({ payload, selection: state, selectedPhase: 0 });

    expect(data.alternativeEvaluation.collectiveGroupPresentation).toMatchObject({ status: "unavailable" });
    renderView(data, state);

    expect(screen.getByTestId("gahpsort-collective-unavailable")).toHaveTextContent("stored sorting result is unavailable");
    expect(screen.queryByTestId("evaluation-renderer-alternativeEvaluation")).not.toBeInTheDocument();
    expect(screen.queryByText("individualSaatyMatrix")).not.toBeInTheDocument();
  });

  it("does not switch individual AHPSort or another result structure to the group view", () => {
    const payload = buildGAHPSortFinishedIssueFixture();
    const presentation = buildAHPSortIGroupEvaluationPresentation({ payload, phase: 0 });
    expect(presentation.status).toBe("available");

    payload.models.base.configuredParameters = { ...payload.models.base.configuredParameters };
    delete payload.models.base.configuredParameters.ahpSortGroup;
    payload.phaseResults[0].requestSnapshot.modelParameters = payload.models.base.configuredParameters;
    payload.phaseResults[0].standardizedOutput.diagnostics = {
      modelKey: "ahp_sort_i",
      profileMode: "limiting",
      resultsByAlternativeId: {},
    };
    expect(buildAHPSortIGroupEvaluationPresentation({ payload, phase: 0 })).toBeNull();

    payload.models.base.technical.apiModelKey = "other_model";
    payload.phaseResults[0].modelSpecificOutput.apiModelKey = "other_model";
    expect(buildAHPSortIGroupEvaluationPresentation({ payload, phase: 0 })).toBeNull();
  });
});
