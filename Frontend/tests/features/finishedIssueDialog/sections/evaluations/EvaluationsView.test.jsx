import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rendererSpy = vi.hoisted(() => vi.fn());

vi.mock("react-chartjs-2", () => ({
  Doughnut: () => <div data-testid="evaluation-participation-chart" />,
}));

vi.mock("../../../../../src/features/issueEvaluation/components/EvaluationStructureRenderer.jsx", () => ({
  default: (props) => {
    rendererSpy(props);
    return <div data-testid={`evaluation-renderer-${props.stage}`} />;
  },
}));

import EvaluationsView from "../../../../../src/features/finishedIssueDialog/sections/evaluations/components/EvaluationsView.jsx";
import { buildEvaluationsWorkspaceData } from "../../../../../src/features/finishedIssueDialog/sections/evaluations/logic/buildEvaluationsWorkspaceData.js";
import {
  evaluationPluginPanelSx,
  evaluationPluginRendererViewportSx,
  evaluationsExpertControlSx,
  evaluationsActionGroupSx,
  evaluationsSelectorGroupSx,
  evaluationsStageDividerNarrowSx,
  evaluationsStageDividerWideSx,
  evaluationsHeaderSx,
  evaluationsWorkspaceSx,
} from "../../../../../src/features/finishedIssueDialog/sections/evaluations/evaluations.styles.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const actions = {
  setSelectedExpertId: vi.fn(),
  setShowCollective: vi.fn(),
};

const selection = {
  selectedExpertId: "expert-1",
  showCollective: false,
};

const renderView = (data, state = selection) => render(
  <ThemeProvider theme={createTheme()}>
    <EvaluationsView data={data} state={state} actions={actions} />
  </ThemeProvider>
);

const payloadWithPartialParticipation = () => {
  const payload = buildFinishedIssuePayloadFixture();
  payload.participants.push(
    {
      id: "p-3",
      expert: { id: "expert-3", name: "Alternative only", email: "alternative@example.test" },
      invitationStatus: "accepted",
    },
    {
      id: "p-4",
      expert: { id: "expert-4", name: "Criteria only", email: "criteria@example.test" },
      invitationStatus: "declined",
    }
  );
  payload.evaluations.individual.push(
    {
      id: "eval-a-3",
      expertId: "expert-3",
      stage: "alternativeEvaluation",
      phase: 5,
      rawPayload: { alternativeOnly: true },
      completed: true,
      submittedAt: "2026-01-04T00:00:00.000Z",
      contextId: "alternativeEvaluation:5",
    },
    {
      id: "eval-c-4",
      expertId: "expert-4",
      stage: "criteriaWeighting",
      phase: 1,
      rawPayload: { criteriaOnly: true },
      completed: true,
      submittedAt: "2026-01-03T00:00:00.000Z",
      contextId: "criteriaWeighting:1",
    }
  );
  return payload;
};

const twoPhasePayload = () => {
  const payload = buildFinishedIssuePayloadFixture();
  payload.evaluations.contexts.push({
    id: "alternativeEvaluation:0",
    stage: "alternativeEvaluation",
    phase: 0,
    structureKey: "alternativeCriteriaMatrix",
    decisionContext: { phase: 0, source: "initial" },
  });
  payload.evaluations.individual.push({
    id: "eval-a-0",
    expertId: "expert-1",
    stage: "alternativeEvaluation",
    phase: 0,
    structureKey: "alternativeCriteriaMatrix",
    rawPayload: { phase: "zero" },
    completed: true,
    submittedAt: "2026-01-01T00:00:00.000Z",
    contextId: "alternativeEvaluation:0",
  });
  payload.evaluations.collective.push({
    phaseResultId: "alt-0",
    stage: "alternativeEvaluation",
    phase: 0,
    rawPayload: { collective: "zero" },
    displayPayload: { collective: "zero" },
    contextId: "alternativeEvaluation:0",
  });
  const finalIndividual = payload.evaluations.individual.find((entry) => entry.id === "eval-a");
  finalIndividual.rawPayload = { phase: "one" };
  finalIndividual.displayPayload = { phase: "one" };
  payload.evaluations.collective.find((entry) => entry.phaseResultId === "alt-5").displayPayload = { collective: "one" };
  return payload;
};

describe("EvaluationsView", () => {
  beforeEach(() => {
    rendererSpy.mockClear();
    Object.values(actions).forEach((action) => action.mockClear());
  });

  it("renders one shared expert selector and both registered read-only renderers", () => {
    const data = buildEvaluationsWorkspaceData({
      payload: buildFinishedIssuePayloadFixture(),
      selection,
      selectedPhase: 5,
    });
    renderView(data);

    const workspace = screen.getByTestId("evaluations-workspace");
    const selectors = within(workspace).getByTestId("evaluations-selector-group");
    const actions = within(workspace).getByTestId("evaluations-action-group");
    expect(within(selectors).getByLabelText("Expert")).toBeInTheDocument();
    expect(within(actions).getByLabelText("Show collective values")).toBeInTheDocument();
    expect(selectors.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(workspace).toContainElement(screen.getByRole("heading", { name: "Criteria weighting" }));
    expect(workspace).toContainElement(screen.getByRole("heading", { name: "Alternative evaluation" }));
    expect(screen.queryByRole("heading", { name: "Evaluations" })).not.toBeInTheDocument();
    expect(screen.queryByText("Review stored expert inputs and collective values.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Criteria weighting" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Expert")).toHaveLength(1);
    expect(screen.queryByLabelText("Consensus round")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Show collective values")).toBeInTheDocument();
    expect(screen.getByTestId("evaluations-stage-divider-wide")).toBeInTheDocument();
    expect(screen.getByTestId("evaluations-stage-divider-narrow")).toBeInTheDocument();
    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "criteriaWeighting", readOnly: true, collectiveEvaluation: null }));
    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "alternativeEvaluation", readOnly: true, collectiveEvaluation: null }));
  });

  it("uses the union of stored submitters and keeps partial-stage experts factual", () => {
    const payload = payloadWithPartialParticipation();
    const data = buildEvaluationsWorkspaceData({
      payload,
      selection: { ...selection, selectedExpertId: "expert-4" },
      selectedPhase: 5,
    });
    renderView(data, { ...selection, selectedExpertId: "expert-4" });

    expect(data.expertOptions.map((expert) => expert.id)).toEqual([
      "expert-1",
      "expert-3",
      "expert-4",
    ]);
    expect(screen.getByText("This expert did not submit an alternative evaluation in this context.")).toBeInTheDocument();
    expect(data.alternativeEvaluation.individual).toBeNull();
    expect(rendererSpy).not.toHaveBeenCalledWith(expect.objectContaining({
      stage: "alternativeEvaluation",
      evaluation: expect.anything(),
    }));
    expect(screen.getByRole("heading", { name: "Criteria weighting" })).toBeInTheDocument();
    expect(screen.getByText("Alternative only")).toBeInTheDocument();
    expect(screen.getByText("Criteria only")).toBeInTheDocument();
  });

  it("keeps collective payloads stage-specific and only supplies them when selected", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const data = buildEvaluationsWorkspaceData({
      payload,
      selection: { ...selection, showCollective: true },
      selectedPhase: 5,
    });
    renderView(data, { ...selection, showCollective: true });

    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "criteriaWeighting", collectiveEvaluation: { weightsByCriterion: {} } }));
    expect(rendererSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "alternativeEvaluation",
        collectiveEvaluation: {
          a: { cost: 4.5, quality: 7.5 },
          b: { cost: 5.5, quality: 7 },
        },
      })
    );
  });

  it("hides criteria weighting and expands alternative evaluation only when the stage has no evidence", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.evaluations.individual = payload.evaluations.individual.filter((entry) => entry.stage !== "criteriaWeighting");
    payload.evaluations.collective = payload.evaluations.collective.filter((entry) => entry.stage !== "criteriaWeighting");
    payload.evaluations.contexts = payload.evaluations.contexts.filter((entry) => entry.stage !== "criteriaWeighting");
    const data = buildEvaluationsWorkspaceData({ payload, selection, selectedPhase: 5 });
    renderView(data);

    expect(screen.queryByRole("heading", { name: "Criteria weighting" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(screen.queryByTestId("evaluations-stage-divider-wide")).not.toBeInTheDocument();
    expect(screen.queryByTestId("evaluations-stage-divider-narrow")).not.toBeInTheDocument();
    expect(evaluationsWorkspaceSx).toMatchObject({ width: "100%", overflow: "hidden" });
    expect(evaluationPluginPanelSx).not.toHaveProperty("boxShadow");
    expect(evaluationPluginPanelSx).not.toHaveProperty("background");
    expect(evaluationPluginPanelSx).not.toHaveProperty("border");
  });

  it("renders a compact domain table and content-driven renderer viewport", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.criteria.nodes.find((criterion) => criterion.id === "cost").type = "cost";
    payload.criteria.nodes.find((criterion) => criterion.id === "quality").type = "benefit";
    const data = buildEvaluationsWorkspaceData({ payload, selection, selectedPhase: 5 });
    renderView(data);

    expect(screen.getByRole("heading", { name: "Expression domains by criterion" })).toBeInTheDocument();
    expect(screen.getByText("Cost")).toBeInTheDocument();
    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getAllByText("Global")).toHaveLength(2);
    expect(screen.queryByText("Benefit")).not.toBeInTheDocument();
    expect(screen.queryByText("Cost")).toBeInTheDocument();
    expect(evaluationPluginRendererViewportSx).not.toHaveProperty("minHeight");
    expect(evaluationPluginRendererViewportSx).toMatchObject({ width: "100%", maxWidth: "100%", maxHeight: { xs: 520, xl: 620 }, overflow: "auto" });
    expect(evaluationsExpertControlSx).toMatchObject({ width: { xs: "100%", sm: 230 } });
    expect(evaluationsHeaderSx).toMatchObject({
      justifyContent: "space-between",
      flexDirection: { xs: "column", md: "row" },
    });
    expect(evaluationsSelectorGroupSx).toMatchObject({ width: { xs: "100%", md: "auto" } });
    expect(evaluationsActionGroupSx).toMatchObject({ width: { xs: "100%", md: "auto" } });
    expect(evaluationsStageDividerWideSx.display).toEqual({ xs: "none", xl: "block" });
    expect(evaluationsStageDividerNarrowSx.display).toEqual({ xs: "block", xl: "none" });
  });

  it("does not render a fake round selector for non-consensus evidence", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.consensus.enabled = false;
    const data = buildEvaluationsWorkspaceData({
      payload,
      selection,
      selectedPhase: null,
    });
    renderView(data, selection);

    expect(screen.queryByLabelText("Consensus round")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Expert")).toHaveLength(1);
    expect(screen.queryByText("Round 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Phase 0")).not.toBeInTheDocument();
  });

  it("uses the global selected phase for alternative evidence while keeping criteria weighting stable", () => {
    const payload = twoPhasePayload();
    const initial = buildEvaluationsWorkspaceData({ payload, selection: { ...selection, showCollective: true }, selectedPhase: 0 });
    const final = buildEvaluationsWorkspaceData({ payload, selection: { ...selection, showCollective: true }, selectedPhase: 5 });
    const fallback = buildEvaluationsWorkspaceData({ payload, selection, selectedPhase: 99 });

    expect(initial.alternativeEvaluation).toMatchObject({ selectedPhase: 0, submittedAt: "2026-01-01T00:00:00.000Z", individual: { payload: { phase: "zero" } }, collective: { payload: { collective: "zero" } }, renderer: { decisionContext: { phase: 0, source: "initial" } } });
    expect(initial.evidence).toMatchObject({ resultId: "alt-0", phase: 0 });
    expect(final.alternativeEvaluation).toMatchObject({ selectedPhase: 5, individual: { payload: { phase: "one" } }, collective: { payload: { collective: "one" } } });
    expect(final.evidence).toMatchObject({ resultId: "alt-5", phase: 5 });
    expect(initial.criteriaWeighting).toMatchObject({ selectedPhase: 1, individual: { id: "eval-c" } });
    expect(final.criteriaWeighting).toEqual(initial.criteriaWeighting);
    expect(fallback.alternativeEvaluation.selectedPhase).toBe(5);
  });
});
