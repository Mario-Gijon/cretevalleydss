import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockUseIssuesDataContext = vi.hoisted(() => vi.fn());
const mockUseSnackbarAlertContext = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../../src/context/issues/issues.context", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useIssuesDataContext: mockUseIssuesDataContext,
  };
});

vi.mock(
  "../../../src/context/snackbarAlert/snackbarAlert.context",
  async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual,
      useSnackbarAlertContext: mockUseSnackbarAlertContext,
    };
  }
);

vi.mock("../../../src/services/issue.service", () => ({
  createIssue: vi.fn(),
}));

import { useCreateIssue } from "../../../src/features/createIssue/hooks/useCreateIssue.js";
import { createIssue } from "../../../src/services/issue.service";
import {
  complexCreateIssueModelFixture,
  consensusNoSimulationModelFixture,
  createIssueAlternativesFixture,
  createIssueCriteriaTreeFixture,
  createIssueExpertsFixture,
  createIssueGlobalExpressionDomainConfigFixture,
  createIssueManualCriteriaWeightingConfigFixture,
  expertWeightModelFixture,
  globalContinuousDomainFixture,
  basicCreateIssueModelFixture,
} from "../../mocks/fixtures/createIssue.fixtures.js";

const LOCAL_STORAGE_KEY = "prevCreateIssueData";

const createIssuesContextValue = (overrides = {}) => ({
  loading: false,
  setLoading: vi.fn(),
  setIssueCreated: vi.fn(),
  globalDomains: [globalContinuousDomainFixture],
  expressionDomains: [],
  ...overrides,
});

describe("useCreateIssue", () => {
  const showSnackbarAlert = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.requestAnimationFrame = vi.fn((callback) => {
      callback(0);
      return 1;
    });
    mockUseSnackbarAlertContext.mockReturnValue({ showSnackbarAlert });
    mockUseIssuesDataContext.mockReturnValue(createIssuesContextValue());
  });

  const renderCreateIssueHook = () => renderHook(() => useCreateIssue());

  const fillValidState = async (result, model = complexCreateIssueModelFixture) => {
    await act(async () => {
      result.current.handleValidateIssueName("Budget planning");
      result.current.handleValidateIssueDescription("Detailed issue summary");
      result.current.setAlternatives(createIssueAlternativesFixture);
      result.current.setCriteria(createIssueCriteriaTreeFixture);
      result.current.setAddedExperts(createIssueExpertsFixture);
      result.current.setSelectedModel(model);
      result.current.setConsensusMaxPhases(4);
      result.current.setConsensusThreshold(0.8);
      result.current.setSimulateConsensus(true);
    });

    await waitFor(() => {
      expect(result.current.selectedModel?._id).toBe(model._id);
      expect(result.current.expressionDomainConfig).toEqual(
        createIssueGlobalExpressionDomainConfigFixture
      );
    });
  };

  it("initializes from empty state safely", () => {
    const { result } = renderCreateIssueHook();

    expect(result.current.activeStep).toBe(0);
    expect(result.current.selectedModel).toBeNull();
    expect(result.current.alternatives).toEqual([]);
    expect(result.current.criteria).toEqual([]);
    expect(result.current.addedExperts).toEqual([]);
    expect(result.current.issueName).toBe("");
    expect(result.current.issueDescription).toBe("");
    expect(result.current.closureDate).toBeNull();
    expect(result.current.paramValues).toEqual({});
    expect(result.current.expressionDomainConfig).toEqual({
      mode: "global",
      globalDomainId: "",
    });
  });

  it("initializes from the stored localStorage draft", async () => {
    const expectedFinalizationDate = dayjs().add(4, "day").startOf("day");

    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        activeStep: 2,
        selectedModel: basicCreateIssueModelFixture,
        alternatives: ["Stored A"],
        criteria: [{ id: "stored-criterion", name: "Cost", children: [] }],
        addedExperts: ["stored@example.com"],
        issueName: "Stored issue",
        issueDescription: "Stored issue description",
        expressionDomainConfig: createIssueGlobalExpressionDomainConfigFixture,
        paramValues: {
          threshold: 0.4,
          criterionScores: { "stored-criterion": 1 },
        },
        consensusMaxPhases: 9,
        consensusThreshold: 0.9,
        closureDate: expectedFinalizationDate.toJSON(),
      })
    );

    const { result, unmount } = renderCreateIssueHook();

    await waitFor(() => {
      expect(result.current.activeStep).toBe(2);
      expect(result.current.issueName).toBe("Stored issue");
      expect(result.current.issueDescription).toBe("Stored issue description");
      expect(result.current.selectedModel?._id).toBe("model-basic");
      expect(result.current.alternatives).toEqual([
        expect.objectContaining({ name: "Stored A", description: "" }),
      ]);
      expect(result.current.criteria).toEqual([
        { id: "stored-criterion", name: "Cost", description: "", children: [] },
      ]);
      expect(result.current.addedExperts).toEqual(["stored@example.com"]);
      expect(result.current.consensusMaxPhases).toBe(9);
      expect(result.current.consensusThreshold).toBe(0.9);
      expect(result.current.closureDate?.toJSON()).toBe(
        expectedFinalizationDate.toJSON()
      );
    });

    unmount();
  });

  it("round-trips the complete meaningful draft without overwriting model-dependent state", async () => {
    const expectedFinalizationDate = dayjs().add(6, "day").startOf("day");
    const customParamValues = {
      threshold: 0.85,
      criterionScores: { "criterion-cost": 0.8, "criterion-speed": 0.3 },
    };
    const customExpertWeights = {
      "expert1@example.com": 0.7,
      "expert2@example.com": 0.3,
    };
    const customCriteriaWeightingConfig = {
      ...createIssueManualCriteriaWeightingConfigFixture,
      payload: {
        weightsByCriterion: {
          "criterion-cost": 0.65,
          "criterion-speed": 0.35,
        },
      },
    };
    const { result, unmount } = renderCreateIssueHook();

    await act(async () => {
      result.current.setSelectedModel(complexCreateIssueModelFixture);
    });
    await waitFor(() => {
      expect(result.current.selectedModel?._id).toBe("model-complex");
    });

    await act(async () => {
      result.current.setAlternatives(createIssueAlternativesFixture);
      result.current.setCriteria(createIssueCriteriaTreeFixture);
      result.current.setAddedExperts(createIssueExpertsFixture);
      result.current.setShowConsensusModels(true);
      result.current.setExpertWeights(customExpertWeights);
      result.current.setExpertWeightsCustomized(true);
      result.current.setParamValues(customParamValues);
      result.current.setCriteriaWeightingConfig(customCriteriaWeightingConfig);
      result.current.setExpressionDomainConfig(
        createIssueGlobalExpressionDomainConfigFixture
      );
      result.current.handleValidateIssueName("Budget planning");
      result.current.handleValidateIssueDescription("Detailed issue summary");
      result.current.setClosureDate(expectedFinalizationDate);
      result.current.setConsensusMaxPhases(null);
      result.current.setConsensusThreshold(0.82);
      result.current.setSimulateConsensus(true);
      result.current.goToStep(5);
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
      expect(stored.paramValues).toEqual(customParamValues);
      expect(stored.criteriaWeightingConfig).toEqual(
        customCriteriaWeightingConfig
      );
      expect(stored.expertWeights).toEqual(customExpertWeights);
      expect(stored.expertWeightsCustomized).toBe(true);
    });

    unmount();
    const remounted = renderCreateIssueHook();

    await waitFor(() => {
      expect(remounted.result.current.selectedModel?._id).toBe("model-complex");
      expect(remounted.result.current.isConsensus).toBe(true);
      expect(remounted.result.current.showConsensusModels).toBe(true);
      expect(remounted.result.current.activeStep).toBe(5);
      expect(remounted.result.current.alternatives).toEqual(
        createIssueAlternativesFixture
      );
      expect(remounted.result.current.criteria).toEqual(
        createIssueCriteriaTreeFixture.map((criterion) => ({
          ...criterion,
          description: "",
          children: criterion.children.map((child) => ({
            ...child,
            description: "",
          })),
        }))
      );
      expect(remounted.result.current.addedExperts).toEqual(
        createIssueExpertsFixture
      );
      expect(remounted.result.current.expertWeights).toEqual(
        customExpertWeights
      );
      expect(remounted.result.current.expertWeightsCustomized).toBe(true);
      expect(remounted.result.current.paramValues).toEqual(customParamValues);
      expect(remounted.result.current.criteriaWeightingConfig).toEqual(
        customCriteriaWeightingConfig
      );
      expect(remounted.result.current.expressionDomainConfig).toEqual(
        createIssueGlobalExpressionDomainConfigFixture
      );
      expect(remounted.result.current.issueName).toBe("Budget planning");
      expect(remounted.result.current.issueDescription).toBe(
        "Detailed issue summary"
      );
      expect(remounted.result.current.closureDate?.toJSON()).toBe(
        expectedFinalizationDate.toJSON()
      );
      expect(remounted.result.current.consensusMaxPhases).toBeNull();
      expect(remounted.result.current.consensusThreshold).toBe(0.82);
      expect(remounted.result.current.simulateConsensus).toBe(true);
    });
  });

  it("reinitializes model-dependent state when the user changes model after hydration", async () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        selectedModel: basicCreateIssueModelFixture,
        paramValues: { threshold: 0.85, criterionScores: { custom: true } },
        criteriaWeightingConfig: { mode: "custom-draft" },
      })
    );

    const { result } = renderCreateIssueHook();

    await waitFor(() => {
      expect(result.current.paramValues).toEqual({
        threshold: 0.85,
        criterionScores: { custom: true },
      });
      expect(result.current.criteriaWeightingConfig).toEqual({
        mode: "custom-draft",
      });
    });

    await act(async () => {
      result.current.setSelectedModel(expertWeightModelFixture);
    });

    await waitFor(() => {
      expect(result.current.paramValues).toEqual({
        threshold: 0.4,
        criterionScores: 1,
      });
      expect(result.current.criteriaWeightingConfig).toBeNull();
    });
  });

  it("persists state changes back to localStorage", async () => {
    const { result } = renderCreateIssueHook();

    await act(async () => {
      result.current.handleValidateIssueName("Budget planning");
      result.current.setAlternatives(["Option A"]);
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
      expect(stored.issueName).toBe("Budget planning");
      expect(stored.alternatives).toEqual(["Option A"]);
    });
  });

  it("selecting a model reinitializes params, criteria weighting, expert weights, and unsupported simulation", async () => {
    const model = {
      ...consensusNoSimulationModelFixture,
      usesCriteriaWeights: true,
      usesExpertWeights: true,
    };
    const { result } = renderCreateIssueHook();

    await act(async () => {
      result.current.setCriteria(createIssueCriteriaTreeFixture);
      result.current.setAddedExperts(createIssueExpertsFixture);
      result.current.setExpertWeights({
        "expert1@example.com": 0.8,
        "expert2@example.com": 0.2,
      });
      result.current.setExpertWeightsCustomized(true);
      result.current.setParamValues({ threshold: 9 });
      result.current.setSimulateConsensus(true);
      result.current.setSelectedModel(model);
    });

    await waitFor(() => {
      expect(result.current.paramValues).toEqual({
        threshold: 0.4,
        criterionScores: 1,
      });
      expect(result.current.criteriaWeightingConfig).toEqual({
        mode: "expertManual",
        source: "experts",
        method: "manual",
        structureKey: "manualCriteriaWeights",
        level: "leaf",
        payload: {},
      });
      expect(result.current.expertWeights).toEqual({
        "expert1@example.com": 0.5,
        "expert2@example.com": 0.5,
      });
      expect(result.current.expertWeightsCustomized).toBe(false);
      expect(result.current.simulateConsensus).toBe(false);
    });
  });

  it("changing criteria keeps ids and parameter values shape-agnostic while normalizing domain config", async () => {
    const { result } = renderCreateIssueHook();

    await act(async () => {
      result.current.setSelectedModel(basicCreateIssueModelFixture);
    });

    await waitFor(() => {
      expect(result.current.selectedModel?._id).toBe("model-basic");
    });

    await act(async () => {
      result.current.setExpressionDomainConfig({
        mode: "global",
        globalDomainId: "missing-domain",
      });
      result.current.setCriteria([
        {
          name: "Impact",
          children: [{ name: "Cost", children: [] }],
        },
      ]);
    });

    await waitFor(() => {
      expect(result.current.criteria[0].id).toBeTruthy();
      expect(result.current.criteria[0].children[0].id).toBeTruthy();
      expect(result.current.paramValues.threshold).toBe(0.4);
      expect(result.current.paramValues.criterionScores).toBe(1);
      expect(result.current.expressionDomainConfig).toEqual(
        createIssueGlobalExpressionDomainConfigFixture
      );
      expect(result.current.defaultModelParams).toBe(true);
    });
  });

  it("preserves plugin-owned parameter objects when criteria change", async () => {
    const { result } = renderCreateIssueHook();

    await act(async () => {
      result.current.setSelectedModel(basicCreateIssueModelFixture);
    });
    await act(async () => {
      result.current.setParamValues({
        threshold: 0.4,
        criterionScores: { oldCriterion: "custom-draft", staleCriterion: "" },
      });
      result.current.setCriteria([{ name: "Impact", children: [{ name: "Cost", children: [] }] }]);
    });

    await waitFor(() => {
      expect(result.current.paramValues).toEqual({
        threshold: 0.4,
        criterionScores: { oldCriterion: "custom-draft", staleCriterion: "" },
      });
    });
  });

  it("clears model parameters when the selected model is removed", async () => {
    const { result } = renderCreateIssueHook();

    await act(async () => {
      result.current.setSelectedModel(basicCreateIssueModelFixture);
    });
    await waitFor(() => expect(result.current.paramValues).toEqual({ threshold: 0.4, criterionScores: 1 }));
    await act(async () => {
      result.current.setSelectedModel(null);
    });
    await waitFor(() => expect(result.current.paramValues).toEqual({}));
  });

  it("changing selected experts keeps expert weights in sync for expert-weight models", async () => {
    const { result } = renderCreateIssueHook();

    await act(async () => {
      result.current.setSelectedModel(expertWeightModelFixture);
    });

    await waitFor(() => {
      expect(result.current.selectedModel?._id).toBe("model-expert-weights");
    });

    await act(async () => {
      result.current.setAddedExperts(createIssueExpertsFixture);
    });

    await waitFor(() => {
      expect(result.current.expertWeights).toEqual({
        "expert1@example.com": 0.5,
        "expert2@example.com": 0.5,
      });
    });

    await act(async () => {
      result.current.setAddedExperts(["expert1@example.com"]);
    });

    await waitFor(() => {
      expect(result.current.expertWeights).toEqual({
        "expert1@example.com": 1,
      });
    });
  });

  it("marks an invalid expected finalization date and shows a snackbar", async () => {
    const { result } = renderCreateIssueHook();

    await act(async () => {
      result.current.setClosureDate(dayjs().add(1, "day"));
      result.current.handleClosureDateError(dayjs().add(1, "day"));
    });

    expect(result.current.closureDateError).toBe(true);
    expect(showSnackbarAlert).toHaveBeenCalledWith("Expected finalization date is not valid", "error");

    localStorage.removeItem(LOCAL_STORAGE_KEY);
  });

  it("updates activeStep through step navigation helpers", () => {
    const { result } = renderCreateIssueHook();

    act(() => {
      result.current.goNextStep();
      result.current.goNextStep();
      result.current.goPrevStep();
      result.current.goToStep(5);
    });

    expect(result.current.activeStep).toBe(5);
  });

  it("does not create an issue when the required name and description are missing", async () => {
    const { result } = renderCreateIssueHook();

    await fillValidState(result);

    await act(async () => {
      result.current.handleValidateIssueName("");
      result.current.handleValidateIssueDescription("");
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(createIssue).not.toHaveBeenCalled();
  });

  it("shows a snackbar and skips the service call when payload building rejects", async () => {
    const { result } = renderCreateIssueHook();

    await act(async () => {
      result.current.handleValidateIssueName("Budget planning");
      result.current.handleValidateIssueDescription("Detailed issue summary");
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(createIssue).not.toHaveBeenCalled();
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "You must select a model before creating the issue.",
      "error"
    );
  });

  it("keeps the create flow loading while navigating after successful creation", async () => {
    const setLoading = vi.fn();
    const setIssueCreated = vi.fn();
    createIssue.mockResolvedValue({
      success: true,
      data: { id: "issue-1" },
    });
    mockUseIssuesDataContext.mockReturnValue(
      createIssuesContextValue({ setLoading, setIssueCreated })
    );

    const { result } = renderCreateIssueHook();

    await fillValidState(result);

    await act(async () => {
      await result.current.handleComplete();
    });

    await waitFor(() => {
      expect(createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          issueName: "Budget planning",
          issueDescription: "Detailed issue summary",
          selectedModelId: "model-complex",
          alternatives: createIssueAlternativesFixture.map(({ name, description }) => ({
            name,
            description,
          })),
        })
      );
      expect(setIssueCreated).toHaveBeenCalledWith({
        success: true,
        data: { id: "issue-1" },
      });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
      expect(setLoading).toHaveBeenCalledWith(true);
      expect(setLoading).not.toHaveBeenCalledWith(false);
      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  it("sends the selected expected finalization date in the create request", async () => {
    createIssue.mockResolvedValue({ success: true, data: { id: "issue-1" } });
    const selectedDate = dayjs().add(4, "day").startOf("day");
    const { result, unmount } = renderCreateIssueHook();

    await fillValidState(result);

    await act(async () => {
      result.current.setClosureDate(selectedDate);
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    const requestPayload = createIssue.mock.calls[0][0];
    const requestBody = JSON.parse(
      JSON.stringify({ issueInfo: requestPayload })
    );

    expect(requestPayload.closureDate).toBeInstanceOf(Date);
    expect(requestBody.issueInfo.closureDate).toBe(
      requestPayload.closureDate.toJSON()
    );

    unmount();
  });

  it("surfaces backend issue-name errors and clears loading", async () => {
    const setLoading = vi.fn();
    createIssue.mockResolvedValue({
      success: false,
      message: "Issue name already exists.",
      error: { field: "issueName" },
    });
    mockUseIssuesDataContext.mockReturnValue(createIssuesContextValue({ setLoading }));

    const { result } = renderCreateIssueHook();

    await fillValidState(result);

    await act(async () => {
      await result.current.handleComplete();
    });

    await waitFor(() => {
      expect(result.current.issueNameError).toBe("Issue name already exists.");
      expect(showSnackbarAlert).toHaveBeenCalledWith(
        "Issue name already exists.",
        "error"
      );
      expect(setLoading).toHaveBeenCalledWith(true);
      expect(setLoading).toHaveBeenCalledWith(false);
    });
  });

  it("shows generic backend errors and clears loading", async () => {
    const setLoading = vi.fn();
    createIssue.mockResolvedValue({
      success: false,
      message: "Issue creation failed.",
    });
    mockUseIssuesDataContext.mockReturnValue(createIssuesContextValue({ setLoading }));

    const { result } = renderCreateIssueHook();

    await fillValidState(result);

    await act(async () => {
      await result.current.handleComplete();
    });

    await waitFor(() => {
      expect(showSnackbarAlert).toHaveBeenCalledWith("Issue creation failed.", "error");
      expect(setLoading).toHaveBeenCalledWith(true);
      expect(setLoading).toHaveBeenCalledWith(false);
    });
  });
});
