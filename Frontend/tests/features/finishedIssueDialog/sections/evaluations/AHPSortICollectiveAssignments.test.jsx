import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../src/features/issueEvaluation/rendering/index.js", () => ({
  EvaluationStructureRenderer: (props) => (
    <div
      data-testid={`evaluation-renderer-${props.stage}`}
      data-evaluation={JSON.stringify(props.evaluation)}
      data-collective-evaluation={JSON.stringify(props.collectiveEvaluation)}
      data-selected-criterion-id={props.viewProps?.selectedCriterionId || ""}
    >
      {props.viewProps?.onSelectedCriterionIdChange ? (
        <button onClick={() => props.viewProps.onSelectedCriterionIdChange("criterion-cost")}>
          Select saved criterion
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("../../../../../src/features/finishedIssueDialog/sections/evaluations/logic/isUsableCollectiveEvaluation.js", () => ({
  isUsableCollectiveEvaluation: ({ collectiveEvaluation }) =>
    collectiveEvaluation !== null && typeof collectiveEvaluation === "object",
}));

import EvaluationsView from "../../../../../src/features/finishedIssueDialog/sections/evaluations/components/EvaluationsView.jsx";
import { buildEvaluationsWorkspaceData } from "../../../../../src/features/finishedIssueDialog/sections/evaluations/logic/buildEvaluationsWorkspaceData.js";
import { buildAHPSortIGroupEvaluationPresentation } from "../../../../../src/features/finishedIssueDialog/sections/evaluations/logic/buildAHPSortIGroupEvaluationPresentation.js";
import { buildAHPSortIGroupFinishedIssueFixture } from "../../../../mocks/fixtures/ahpSortIGroupFinishedIssue.fixture.js";

const selection = { selectedExpertId: "expert-a", showCollective: false };
const actions = { setSelectedExpertId: vi.fn(), setShowCollective: vi.fn() };

const renderView = (data, state) => render(
  <ThemeProvider theme={createTheme()}>
    <EvaluationsView data={data} state={state} actions={actions} />
  </ThemeProvider>
);

describe("AHPSort I collective presentation in Finished Issues", () => {
  it("switches both AHPSort I stages between individual matrices and collective summaries", () => {
    const payload = buildAHPSortIGroupFinishedIssueFixture();
    const data = buildEvaluationsWorkspaceData({ payload, selection, selectedPhase: 0 });

    expect(data.alternativeEvaluation.collectiveGroupPresentation).toMatchObject({ status: "available" });
    const rendered = renderView(data, selection);
    const alternativePanel = screen.getByTestId("evaluation-stage-panel-alternativeEvaluation");
    expect(within(alternativePanel).getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(within(alternativePanel).getByText("Performance of alternatives on each criterion.")).toBeInTheDocument();
    expect(screen.queryByTestId("ahpsort-i-collective-assignments")).not.toBeInTheDocument();
    expect(screen.getByTestId("evaluation-renderer-alternativeEvaluation")).toBeInTheDocument();
    const criteriaPanel = screen.getByTestId("evaluation-stage-panel-criteriaWeighting");
    expect(within(criteriaPanel).getByTestId("evaluation-renderer-criteriaWeighting")).toBeInTheDocument();
    expect(within(criteriaPanel).queryByTestId("ahpsort-i-criteria-weight-summary")).not.toBeInTheDocument();
    expect(within(alternativePanel).getByRole("button", { name: "Select saved criterion" })).toBeInTheDocument();
    fireEvent.click(within(alternativePanel).getByRole("button", { name: "Select saved criterion" }));

    const collectiveState = { ...selection, showCollective: true };
    rendered.rerender(
      <ThemeProvider theme={createTheme()}>
        <EvaluationsView data={data} state={collectiveState} actions={actions} />
      </ThemeProvider>
    );

    expect(within(alternativePanel).getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(within(alternativePanel).getByRole("heading", { name: "Collective assignment" })).toBeInTheDocument();
    expect(within(alternativePanel).queryByText("Performance of alternatives on each criterion.")).not.toBeInTheDocument();
    expect(within(alternativePanel).queryByText(/^Submitted:/)).not.toBeInTheDocument();
    const table = screen.getByTestId("ahpsort-i-collective-assignments");
    expect(window.getComputedStyle(table).overflowX).toBe("auto");
    expect(window.getComputedStyle(table).overflowY).toBe("hidden");
    expect(within(table).getByRole("columnheader", { name: "Alternative" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Selected expert" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Collective assignment" })).toBeInTheDocument();
    const rows = within(table).getAllByTestId("ahpsort-i-collective-assignment-row");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("Spain");
    expect(rows[0]).toHaveTextContent("BadBad");
    expect(rows[1]).toHaveTextContent("United Kingdom");
    expect(rows[1]).toHaveTextContent("GoodGood");
    expect(rows[3]).toHaveTextContent("Norway");
    expect(rows[3]).toHaveTextContent("ModerateModerate");
    expect(rows[4]).toHaveTextContent("Romania");
    expect(rows[4]).toHaveTextContent("ModerateModerate");
    expect(table.textContent).not.toMatch(/expert-[a-z]|cat-(bad|moderate|good)|united-kingdom|votes/i);

    expect(within(alternativePanel).queryByTestId("evaluation-renderer-alternativeEvaluation")).not.toBeInTheDocument();
    expect(within(alternativePanel).queryByRole("tablist", { name: "Choose a criterion to evaluate" })).not.toBeInTheDocument();
    expect(data.criteriaWeighting.renderer).toMatchObject({
      collectiveEvaluation: expect.objectContaining({ weightsByCriterion: { "criterion-quality": 0.55, "criterion-cost": 0.45 } }),
      readOnly: true,
    });

    const collectiveCriteriaPanel = screen.getByTestId("evaluation-stage-panel-criteriaWeighting");
    expect(within(collectiveCriteriaPanel).queryByTestId("evaluation-renderer-criteriaWeighting")).not.toBeInTheDocument();
    expect(within(collectiveCriteriaPanel).queryByText(/^Submitted:/)).not.toBeInTheDocument();
    const weightsTable = within(collectiveCriteriaPanel).getByRole("table", { name: "Criterion weights" });
    expect(window.getComputedStyle(weightsTable).minWidth).toBe("560px");
    expect(window.getComputedStyle(weightsTable.parentElement).overflowX).toBe("auto");
    expect(within(weightsTable).getByRole("columnheader", { name: "Criterion" })).toBeInTheDocument();
    expect(within(weightsTable).getByRole("columnheader", { name: "Selected expert" })).toBeInTheDocument();
    expect(within(weightsTable).getByRole("columnheader", { name: "Collective (MCC)" })).toBeInTheDocument();
    const weightRows = within(weightsTable).getAllByRole("row");
    expect(weightRows[1]).toHaveTextContent("Quality70.00%55.00%");
    expect(weightRows[2]).toHaveTextContent("Cost30.00%45.00%");
    expect(within(collectiveCriteriaPanel).queryByText("Selected expert priorities")).not.toBeInTheDocument();
    expect(screen.queryByText(/GAHPSort/i)).not.toBeInTheDocument();

    rendered.rerender(
      <ThemeProvider theme={createTheme()}>
        <EvaluationsView data={data} state={selection} actions={actions} />
      </ThemeProvider>
    );
    expect(within(alternativePanel).getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(within(alternativePanel).getByText("Performance of alternatives on each criterion.")).toBeInTheDocument();
    expect(screen.queryByTestId("ahpsort-i-collective-assignments")).not.toBeInTheDocument();
    const restoredAlternativeMatrix = screen.getByTestId("evaluation-renderer-alternativeEvaluation");
    expect(restoredAlternativeMatrix).toBeInTheDocument();
    expect(restoredAlternativeMatrix).toHaveAttribute("data-selected-criterion-id", "criterion-cost");
    expect(within(criteriaPanel).getByTestId("evaluation-renderer-criteriaWeighting")).toBeInTheDocument();
    expect(within(criteriaPanel).queryByTestId("ahpsort-i-criteria-weight-summary")).not.toBeInTheDocument();
  });

  it("updates the selected expert's assignment while collective output remains global by alternative", () => {
    const payload = buildAHPSortIGroupFinishedIssueFixture();
    const state = { ...selection, showCollective: true };
    const initialData = buildEvaluationsWorkspaceData({ payload, selection: state, selectedPhase: 0 });
    const rendered = renderView(initialData, state);
    const table = screen.getByTestId("ahpsort-i-collective-assignments");
    let unitedKingdom = within(table).getAllByTestId("ahpsort-i-collective-assignment-row")[1];
    expect(unitedKingdom).toHaveTextContent("GoodGood");

    const nextState = { ...state, selectedExpertId: "expert-b" };
    const nextData = buildEvaluationsWorkspaceData({ payload, selection: nextState, selectedPhase: 0 });
    rendered.rerender(
      <ThemeProvider theme={createTheme()}>
        <EvaluationsView data={nextData} state={nextState} actions={actions} />
      </ThemeProvider>
    );

    unitedKingdom = within(table).getAllByTestId("ahpsort-i-collective-assignment-row")[1];
    expect(unitedKingdom).toHaveTextContent("ModerateGood");
    expect(within(table).getByRole("columnheader", { name: "Collective assignment" })).toBeInTheDocument();
    const weightsTable = screen.getByRole("table", { name: "Criterion weights" });
    expect(within(weightsTable).getAllByRole("row")[1]).toHaveTextContent("Quality40.00%55.00%");
  });

  it("preserves the saved collective class and group diagnostics for Analysis", () => {
    const payload = buildAHPSortIGroupFinishedIssueFixture({ tiePolicy: "pessimistic" });
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

  it("shows only the integrity warning when collective assignments cannot be verified", () => {
    const payload = buildAHPSortIGroupFinishedIssueFixture();
    payload.phaseResults[0].standardizedOutput.diagnostics.resultsByAlternativeId.spain.votesByCategoryId["cat-bad"] = 99;
    const state = { ...selection, showCollective: true };
    const data = buildEvaluationsWorkspaceData({ payload, selection: state, selectedPhase: 0 });

    expect(data.alternativeEvaluation.collectiveGroupPresentation.status).toBe("integrity_warning");
    renderView(data, state);

    expect(screen.getByTestId("ahpsort-i-collective-integrity-warning")).toHaveTextContent("could not be verified");
    expect(screen.queryByTestId("evaluation-renderer-alternativeEvaluation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ahpsort-i-collective-assignments")).not.toBeInTheDocument();
  });

  it("shows an unavailable state instead of inventing collective Saaty values", () => {
    const payload = buildAHPSortIGroupFinishedIssueFixture();
    payload.phaseResults[0].standardizedOutput = null;
    const state = { ...selection, showCollective: true };
    const data = buildEvaluationsWorkspaceData({ payload, selection: state, selectedPhase: 0 });

    expect(data.alternativeEvaluation.collectiveGroupPresentation).toMatchObject({ status: "unavailable" });
    renderView(data, state);

    expect(screen.getByTestId("ahpsort-i-collective-unavailable")).toHaveTextContent("Collective assignments are unavailable");
    expect(screen.queryByTestId("evaluation-renderer-alternativeEvaluation")).not.toBeInTheDocument();
    expect(screen.queryByText(/collective saaty/i)).not.toBeInTheDocument();
  });

  it("does not show the collective control for a single-expert AHPSort I issue", () => {
    const payload = buildAHPSortIGroupFinishedIssueFixture();
    payload.evaluations.individual = payload.evaluations.individual.filter((entry) => entry.expertId === "expert-a");
    payload.participants = payload.participants.filter((entry) => entry.expert.id === "expert-a");
    payload.participantHistory.records = payload.participantHistory.records.filter((entry) => entry.expert.id === "expert-a");
    const state = { ...selection, showCollective: false };
    const data = buildEvaluationsWorkspaceData({ payload, selection: state, selectedPhase: 0 });

    expect(data.canShowCollective).toBe(false);
    renderView(data, state);

    expect(screen.queryByLabelText("Show collective values")).not.toBeInTheDocument();
    expect(screen.getByTestId("evaluation-renderer-alternativeEvaluation")).toBeInTheDocument();
    expect(screen.queryByTestId("ahpsort-i-criteria-weight-summary")).not.toBeInTheDocument();
    expect(screen.getByTestId("evaluation-renderer-criteriaWeighting")).toBeInTheDocument();
  });
});
