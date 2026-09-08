import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

const renderControlledCriteriaStep = ({
  criteria,
  criteriaWeightingModels,
  initialCriteriaWeightingConfig,
}) => {
  let currentConfig = initialCriteriaWeightingConfig;
  const setDefaultModelParams = vi.fn();

  const ControlledCriteriaStep = () => {
    const [criteriaWeightingConfig, setCriteriaWeightingConfig] = useState(
      initialCriteriaWeightingConfig
    );
    currentConfig = criteriaWeightingConfig;

    mockUseCreateIssueContext.mockReturnValue({
      criteria,
      setCriteria: vi.fn(),
      selectedModel: criteriaWeightModelFixture,
      criteriaWeightingConfig,
      setCriteriaWeightingConfig,
      setDefaultModelParams,
      expressionDomainConfig: { mode: "global", globalDomainId: "" },
    });

    return <CriteriaStep />;
  };

  mockUseSnackbarAlertContext.mockReturnValue({ showSnackbarAlert: vi.fn() });
  mockUseIssuesDataContext.mockReturnValue({
    globalDomains: [],
    expressionDomains: [],
    criteriaWeightingModels,
  });

  return {
    ...renderWithProviders(<ControlledCriteriaStep />),
    getConfig: () => currentConfig,
    setDefaultModelParams,
  };
};

describe("CriteriaStep manual equal weights", () => {
  it("maps Manual MCC experts consensus to its canonical expert weighting config", async () => {
    const criteria = [
      {
        id: "criterion-root",
        name: "Impact",
        children: [
          { id: "criterion-cost", name: "Cost", children: [] },
          { id: "criterion-speed", name: "Speed", children: [] },
        ],
      },
    ];

    const controlled = renderControlledCriteriaStep({
      criteria,
      criteriaWeightingModels: [
        {
          _id: "manual-criteria-weighting-model",
          apiModelKey: "manual_criteria_weights",
          modelKind: "criteriaWeighting",
          supportsExpertCriteriaWeighting: true,
        },
      ],
      initialCriteriaWeightingConfig: {
        mode: "creatorManual",
        source: "creator",
        method: "manual",
        structureKey: "manualCriteriaWeights",
        level: "leaf",
        payload: { weightsByCriterion: {} },
      },
    });

    expect(screen.getAllByRole("button", { name: /^Manual/ })).toHaveLength(1);
    expect(screen.queryByText("Manual by experts")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "MCC EXPERTS CONSENSUS" })
    );

    expect(controlled.setDefaultModelParams).toHaveBeenCalledWith(false);
    expect(controlled.getConfig()).toEqual({
      mode: "expertManual",
      source: "experts",
      method: "manual",
      structureKey: "manualCriteriaWeights",
      criteriaWeightingModelKey: "manual_criteria_weights",
      level: "leaf",
      payload: {},
    });
  });

  it("stores internal equal weights for six criteria without rounding them to 0.167", async () => {
    const criteria = Array.from({ length: 6 }, (_, index) => ({
      id: `criterion-${index + 1}`,
      name: `Criterion ${index + 1}`,
      children: [],
    }));

    const controlled = renderControlledCriteriaStep({
      criteria,
      criteriaWeightingModels: [],
      initialCriteriaWeightingConfig: {
        mode: "creatorManual",
        source: "creator",
        method: "manual",
        structureKey: "manualCriteriaWeights",
        level: "leaf",
        payload: { weightsByCriterion: {} },
      },
    });

    expect(screen.getByRole("button", { name: "Equal weights" })).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Assign each criterion a weight between 0 and 1. Submitted weights must sum to 1."
      )
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Equal weights" }));

    expect(controlled.setDefaultModelParams).toHaveBeenCalledWith(false);

    const weightsByCriterion =
      controlled.getConfig().payload.weightsByCriterion;
    expect(weightsByCriterion).toEqual(
      buildCreateIssueEqualManualWeights(criteria)
    );
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
