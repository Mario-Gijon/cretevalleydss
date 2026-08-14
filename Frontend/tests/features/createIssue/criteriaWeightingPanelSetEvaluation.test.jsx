import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseIssuesDataContext = vi.hoisted(() => vi.fn());
const mockViewState = vi.hoisted(() => ({ lastProps: null }));
const mockGetEvaluationStructureEntryForStage = vi.hoisted(() => vi.fn());
const mockBuildInitialEvaluation = vi.hoisted(() =>
  vi.fn(() => ({ initialized: true }))
);

vi.mock(
  "../../../src/context/issues/issues.context",
  async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual,
      useIssuesDataContext: mockUseIssuesDataContext,
    };
  }
);

vi.mock(
  "../../../src/features/decisionPlugins/evaluations/evaluationStructureRegistry",
  async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual,
      getEvaluationStructureEntryForStage:
        mockGetEvaluationStructureEntryForStage,
    };
  }
);

import { CriteriaWeightingPanel } from "../../../src/features/createIssue/criteria/components/CriteriaWeightingPanel.jsx";
import { criteriaWeightModelFixture } from "../../mocks/fixtures/createIssue.fixtures.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("CriteriaWeightingPanel setEvaluation contract", () => {
  const weightingModel = {
    _id: "weighting-model",
    apiModelKey: "weighting_model",
    displayName: "BWM",
    modelKind: "criteriaWeighting",
    supportsCreatorCriteriaWeighting: true,
    supportsExpertCriteriaWeighting: true,
    evaluationStructureKey: "mockCriteriaWeighting",
  };
  const initialConfig = {
    mode: "creatorApiModel",
    source: "creator",
    method: "apiModel",
    structureKey: "mockCriteriaWeighting",
    criteriaWeightingModelId: weightingModel._id,
    criteriaWeightingModelKey: weightingModel.apiModelKey,
    criteriaWeightingParameters: {},
    payload: { previous: true },
    initializationIdentity: JSON.stringify([
      "weighting-model",
      "mockCriteriaWeighting",
      ["criterion-a", "criterion-b"],
    ]),
  };
  const setCriteriaWeightingConfig = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockViewState.lastProps = null;
    mockBuildInitialEvaluation.mockReturnValue({ initialized: true });
    mockGetEvaluationStructureEntryForStage.mockReturnValue({
      key: "mockCriteriaWeighting",
      stage: "criteriaWeighting",
      View: (props) => {
        mockViewState.lastProps = props;
        return <div>Mock criteria weighting view</div>;
      },
      buildInitialEvaluation: mockBuildInitialEvaluation,
    });
    mockUseIssuesDataContext.mockReturnValue({
      globalDomains: [],
      expressionDomains: [],
      criteriaWeightingModels: [weightingModel],
    });
  });

  const defaultCriteria = [
    { id: "criterion-a", name: "A", children: [] },
    { id: "criterion-b", name: "B", children: [] },
  ];

  const renderPanel = (config = initialConfig, criteria = defaultCriteria) =>
    renderWithProviders(
      <CriteriaWeightingPanel
        selectedModel={criteriaWeightModelFixture}
        criteria={criteria}
        criteriaWeightingConfig={config}
        setCriteriaWeightingConfig={setCriteriaWeightingConfig}
        setDefaultModelParams={vi.fn()}
        expressionDomainConfig={{ mode: "global", globalDomainId: "" }}
      />
    );

  it("accepts a complete object and replaces the creation payload completely", () => {
    renderPanel();
    const replacement = { replacement: true };

    act(() => {
      mockViewState.lastProps.setEvaluation(replacement);
    });

    expect(setCriteriaWeightingConfig).toHaveBeenLastCalledWith({
      ...initialConfig,
      payload: replacement,
    });
    expect(setCriteriaWeightingConfig.mock.calls.at(-1)[0].payload).toBe(
      replacement
    );
    expect(
      setCriteriaWeightingConfig.mock.calls.at(-1)[0].payload
    ).not.toHaveProperty("previous");
    expect(
      setCriteriaWeightingConfig.mock.calls.at(-1)[0].initializationIdentity
    ).toBe(initialConfig.initializationIdentity);
  });

  it.each([
    ["a functional updater", (previous) => previous],
    ["an array", []],
    ["null", null],
    ["a primitive", 1],
  ])("rejects %s without updating creation state", (_label, invalidValue) => {
    renderPanel();
    const callsBefore = setCriteriaWeightingConfig.mock.calls.length;

    expect(() => mockViewState.lastProps.setEvaluation(invalidValue)).toThrow(
      "setEvaluation requires a complete evaluation object."
    );
    expect(setCriteriaWeightingConfig).toHaveBeenCalledTimes(callsBefore);
  });

  it("passes the canonical Create Issue context and never a placeholder object", () => {
    renderPanel();

    expect(mockViewState.lastProps.decisionContext).toMatchObject({
      issue: {
        id: null,
        name: null,
        currentStage: "criteriaWeighting",
        consensusPhase: 0,
      },
      structure: {
        key: "mockCriteriaWeighting",
        stage: "criteriaWeighting",
      },
      alternatives: [],
    });
    expect(mockViewState.lastProps.decisionContext.leafCriteria).toEqual([
      expect.objectContaining({ id: "criterion-a", name: "A" }),
      expect.objectContaining({ id: "criterion-b", name: "B" }),
    ]);
    expect(mockViewState.lastProps.evaluation).toBe(initialConfig.payload);
    expect(mockViewState.lastProps.evaluation).not.toEqual({});
  });

  it("renders one BWM method card and exposes MCC experts consensus from capabilities", () => {
    renderPanel();

    expect(
      screen.getByRole("button", { name: /BWM Compute now/ })
    ).toHaveAttribute("aria-disabled", "false");
    expect(
      screen.queryByText("BWM by experts")
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /BWM/ })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "MCC EXPERTS CONSENSUS" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("initializes creator mode before mounting and leaves expert mode uninitialized", async () => {
    renderPanel({
      ...initialConfig,
      mode: "expertApiModel",
      source: "experts",
      payload: {},
      initializationIdentity: undefined,
    });

    await userEvent.click(
      screen.getByRole("button", { name: /BWM Compute now/ })
    );

    expect(mockBuildInitialEvaluation).toHaveBeenCalledTimes(1);
    expect(setCriteriaWeightingConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "creatorApiModel",
        source: "creator",
        payload: { initialized: true },
        initializationIdentity: JSON.stringify([
          "weighting-model",
          "mockCriteriaWeighting",
          ["criterion-a", "criterion-b"],
        ]),
      })
    );

    mockBuildInitialEvaluation.mockClear();
    await userEvent.click(
      screen.getByRole("button", { name: "MCC EXPERTS CONSENSUS" })
    );

    expect(mockBuildInitialEvaluation).not.toHaveBeenCalled();
    expect(setCriteriaWeightingConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "expertApiModel",
        source: "experts",
        payload: {},
      })
    );
  });

  it("reinitializes on leaf-id changes but preserves payload on a rename", () => {
    const addedCriterion = {
      id: "criterion-c",
      name: "C",
      children: [],
    };

    renderPanel(initialConfig, [...defaultCriteria, addedCriterion]);

    expect(mockBuildInitialEvaluation).toHaveBeenCalledTimes(1);
    expect(setCriteriaWeightingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { initialized: true },
        initializationIdentity: JSON.stringify([
          "weighting-model",
          "mockCriteriaWeighting",
          ["criterion-a", "criterion-b", "criterion-c"],
        ]),
      })
    );

    vi.clearAllMocks();
    mockUseIssuesDataContext.mockReturnValue({
      globalDomains: [],
      expressionDomains: [],
      criteriaWeightingModels: [weightingModel],
    });
    renderPanel(initialConfig, [
      { ...defaultCriteria[0], name: "Renamed A" },
      defaultCriteria[1],
    ]);

    expect(mockBuildInitialEvaluation).not.toHaveBeenCalled();
    expect(setCriteriaWeightingConfig).not.toHaveBeenCalled();
  });

  it("reinitializes after a criterion is removed from a larger identity", () => {
    const threeCriterionConfig = {
      ...initialConfig,
      initializationIdentity: JSON.stringify([
        "weighting-model",
        "mockCriteriaWeighting",
        ["criterion-a", "criterion-b", "criterion-c"],
      ]),
      payload: { previousThreeCriterionPayload: true },
    };

    renderPanel(threeCriterionConfig, defaultCriteria);

    expect(mockBuildInitialEvaluation).toHaveBeenCalledTimes(1);
    expect(setCriteriaWeightingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { initialized: true },
        initializationIdentity: initialConfig.initializationIdentity,
      })
    );
  });

  it("disables creator mode and warns when initialization is unavailable", () => {
    mockGetEvaluationStructureEntryForStage.mockReturnValue({
      key: "mockCriteriaWeighting",
      stage: "criteriaWeighting",
      View: () => <div>Uninitializable view</div>,
    });

    renderPanel();

    expect(
      screen.getByRole("button", { name: /BWM Compute now/ })
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(
        /BWM cannot be computed during issue creation because its evaluation structure does not expose both/
      )
    ).toBeInTheDocument();
    expect(mockViewState.lastProps).toBeNull();
  });
});
