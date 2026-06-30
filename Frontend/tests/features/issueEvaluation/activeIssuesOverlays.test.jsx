import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEvaluationDialogHost = vi.hoisted(() => vi.fn());

vi.mock(
  "../../../src/features/activeIssues/components/drawer/ActiveIssueDrawer",
  () => ({
    default: () => <div>drawer</div>,
  })
);

vi.mock(
  "../../../src/features/activeIssues/components/ActiveIssueConfirmDialog",
  () => ({
    default: () => <div>confirm</div>,
  })
);

vi.mock(
  "../../../src/features/issueExperts/components/IssueExpertsDialogs.jsx",
  () => ({
    default: () => <div>experts-dialogs</div>,
  })
);

vi.mock(
  "../../../src/features/issueEvaluation/components/EvaluationDialogHost.jsx",
  () => ({
    default: (props) => {
      mockEvaluationDialogHost(props);
      return <div>host:{props.stage}:{String(props.isOpen)}</div>;
    },
  })
);

import ActiveIssuesOverlays from "../../../src/features/activeIssues/components/ActiveIssuesOverlays.jsx";
import { EVALUATION_STAGES } from "../../../src/features/decisionPlugins/evaluations/evaluationStages.js";
import { activeIssuesDashboardFixture } from "../../mocks/fixtures/issues.fixtures.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("ActiveIssuesOverlays", () => {
  const baseProps = {
    busy: {
      resolve: false,
      compute: false,
      remove: false,
      leave: false,
      editExperts: false,
    },
    drawerOpen: false,
    closeDrawer: vi.fn(),
    minimizeDrawerOnly: vi.fn(),
    selectedIssue: activeIssuesDashboardFixture[0],
    isMobile: false,
    drawerTab: 0,
    setDrawerTab: vi.fn(),
    openConfirm: vi.fn(),
    handleLeaveIssue: vi.fn(),
    handleComputeWeights: vi.fn(),
    handleResolveIssue: vi.fn(),
    handleRemoveIssue: vi.fn(),
    setIsRatingAlternatives: vi.fn(),
    setIsRatingWeights: vi.fn(),
    setDrawerOpen: vi.fn(),
    isRatingAlternatives: false,
    isRatingWeights: false,
    confirm: {
      open: false,
      title: "",
      description: "",
      confirmText: "",
      tone: "info",
    },
    closeConfirm: vi.fn(),
    runConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an alternative-evaluation host when the rating flag is enabled", () => {
    renderWithProviders(
      <ActiveIssuesOverlays
        {...baseProps}
        isRatingAlternatives
      />
    );

    expect(
      mockEvaluationDialogHost.mock.calls.some(
        ([props]) =>
          props.issue === activeIssuesDashboardFixture[0] &&
          props.stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION &&
          props.isOpen === true
      )
    ).toBe(true);
  });

  it("renders a criteria-weighting host when the rating flag is enabled", () => {
    renderWithProviders(
      <ActiveIssuesOverlays
        {...baseProps}
        isRatingWeights
      />
    );

    expect(
      mockEvaluationDialogHost.mock.calls.some(
        ([props]) =>
          props.issue === activeIssuesDashboardFixture[0] &&
          props.stage === EVALUATION_STAGES.CRITERIA_WEIGHTING &&
          props.isOpen === true
      )
    ).toBe(true);
  });

  it("shows a backdrop loading state when any busy flag is active", () => {
    renderWithProviders(
      <ActiveIssuesOverlays
        {...baseProps}
        busy={{
          ...baseProps.busy,
          compute: true,
        }}
      />
    );

    expect(screen.getByRole("progressbar", { hidden: true })).toBeInTheDocument();
  });
});
