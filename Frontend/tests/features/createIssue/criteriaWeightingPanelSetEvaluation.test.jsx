import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseIssuesDataContext = vi.hoisted(() => vi.fn());
const mockViewState = vi.hoisted(() => ({ lastProps: null }));

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
  "../../../src/features/decisionPlugins/evaluations/registry",
  async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual,
      getEvaluationStructureEntryForStage: () => ({
        key: "mockCriteriaWeighting",
        stage: "criteriaWeighting",
        View: (props) => {
          mockViewState.lastProps = props;
          return <div>Mock criteria weighting view</div>;
        },
      }),
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
    modelKind: "criteriaWeighting",
    supportsCreatorCriteriaWeighting: true,
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
  };
  const setCriteriaWeightingConfig = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockViewState.lastProps = null;
    mockUseIssuesDataContext.mockReturnValue({
      globalDomains: [],
      expressionDomains: [],
      criteriaWeightingModels: [weightingModel],
    });
  });

  const renderPanel = () =>
    renderWithProviders(
      <CriteriaWeightingPanel
        selectedModel={criteriaWeightModelFixture}
        criteria={[
          { id: "criterion-a", name: "A", children: [] },
          { id: "criterion-b", name: "B", children: [] },
        ]}
        criteriaWeightingConfig={initialConfig}
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
});
