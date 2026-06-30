import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockUseCreateIssueContext = vi.hoisted(() => vi.fn());
const mockUseIssuesDataContext = vi.hoisted(() => vi.fn());
const mockUseSnackbarAlertContext = vi.hoisted(() => vi.fn());

vi.mock("../../../src/features/createIssue/context/createIssue.context", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useCreateIssueContext: mockUseCreateIssueContext,
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

import { CriteriaStep } from "../../../src/features/createIssue/criteria/CriteriaStep.jsx";
import {
  buildCreateIssueEqualManualWeights,
  validateCreateIssueManualCriteriaWeighting,
} from "../../../src/features/createIssue/logic/createIssueCriteriaWeighting.js";
import { criteriaWeightModelFixture } from "../../mocks/fixtures/createIssue.fixtures.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("CriteriaStep manual equal weights", () => {
  it("stores internal equal weights for six criteria without rounding them to 0.167", async () => {
    const setCriteriaWeightingConfig = vi.fn();
    const setDefaultModelParams = vi.fn();
    const criteria = Array.from({ length: 6 }, (_, index) => ({
      id: `criterion-${index + 1}`,
      name: `Criterion ${index + 1}`,
      children: [],
    }));

    mockUseSnackbarAlertContext.mockReturnValue({ showSnackbarAlert: vi.fn() });
    mockUseIssuesDataContext.mockReturnValue({
      globalDomains: [],
      expressionDomains: [],
      criteriaWeightingModels: [],
    });
    mockUseCreateIssueContext.mockReturnValue({
      criteria,
      setCriteria: vi.fn(),
      selectedModel: criteriaWeightModelFixture,
      criteriaWeightingConfig: {
        mode: "creatorManual",
        source: "creator",
        method: "manual",
        structureKey: "manualCriteriaWeights",
        payload: { weightsByCriterion: {} },
      },
      setCriteriaWeightingConfig,
      setDefaultModelParams,
      expressionDomainConfig: { mode: "global", globalDomainId: "" },
    });

    renderWithProviders(<CriteriaStep />);

    await userEvent.click(screen.getByRole("button", { name: "Equal weights" }));

    expect(setDefaultModelParams).toHaveBeenCalledWith(false);
    expect(setCriteriaWeightingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          weightsByCriterion: buildCreateIssueEqualManualWeights(criteria),
        },
      })
    );

    const weightsByCriterion =
      setCriteriaWeightingConfig.mock.calls[0][0].payload.weightsByCriterion;
    expect(
      validateCreateIssueManualCriteriaWeighting({
        criteriaWeightingConfig: {
          mode: "creatorManual",
          payload: { weightsByCriterion },
        },
        leafCriteria: criteria,
      })
    ).toBeNull();
  });
});
