import { act, renderHook, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    expect(result.current.paramValues).toEqual({});
    expect(result.current.expressionDomainConfig).toEqual({
      mode: "global",
      globalDomainId: "",
    });
  });

  it("initializes from the stored localStorage draft", async () => {
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
      })
    );

    const { result } = renderCreateIssueHook();

    await waitFor(() => {
      expect(result.current.activeStep).toBe(2);
      expect(result.current.issueName).toBe("Stored issue");
      expect(result.current.issueDescription).toBe("Stored issue description");
      expect(result.current.selectedModel?._id).toBe("model-basic");
      expect(result.current.alternatives).toEqual(["Stored A"]);
      expect(result.current.criteria).toEqual([
        { id: "stored-criterion", name: "Cost", children: [] },
      ]);
      expect(result.current.addedExperts).toEqual(["stored@example.com"]);
      expect(result.current.consensusMaxPhases).toBe(9);
      expect(result.current.consensusThreshold).toBe(0.9);
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
        criterionScores: {
          "criterion-cost": 1,
          "criterion-speed": 1,
        },
      });
      expect(result.current.criteriaWeightingConfig).toEqual({
        mode: "expertManual",
        source: "experts",
        method: "manual",
        structureKey: "manualCriteriaWeights",
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

  it("changing criteria keeps ids, refreshes parameter values, and normalizes domain config", async () => {
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
      expect(result.current.paramValues.criterionScores).toEqual({
        [result.current.criteria[0].children[0].id]: 1,
      });
      expect(result.current.expressionDomainConfig).toEqual(
        createIssueGlobalExpressionDomainConfigFixture
      );
      expect(result.current.defaultModelParams).toBe(true);
    });
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

  it("marks an invalid closure date and shows a snackbar", async () => {
    const { result } = renderCreateIssueHook();

    await act(async () => {
      result.current.setClosureDate(dayjs().add(1, "day"));
      result.current.handleClosureDateError(dayjs().add(1, "day"));
    });

    expect(result.current.closureDateError).toBe(true);
    expect(showSnackbarAlert).toHaveBeenCalledWith("Closure date is not valid", "error");
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

  it("creates the issue successfully and clears loading after requestAnimationFrame", async () => {
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
          alternatives: createIssueAlternativesFixture,
        })
      );
      expect(setIssueCreated).toHaveBeenCalledWith({
        success: true,
        data: { id: "issue-1" },
      });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
      expect(setLoading).toHaveBeenCalledWith(true);
      expect(setLoading).toHaveBeenCalledWith(false);
    });
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
