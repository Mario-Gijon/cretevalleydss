import { describe, expect, it } from "vitest";

import { buildCreateIssueRequestPayload } from "../../../src/features/createIssue/logic/createIssuePayload.js";
import {
  createIssueAlternativesFixture,
  createIssueCriteriaTreeFixture,
  createIssueExpertWeightsFixture,
  createIssueExpertsFixture,
  createIssueGlobalExpressionDomainConfigFixture,
  createIssueManualCriteriaWeightingConfigFixture,
  createIssueParamValuesFixture,
  basicCreateIssueModelFixture,
  complexCreateIssueModelFixture,
  consensusNoSimulationModelFixture,
  criteriaWeightModelFixture,
  globalContinuousDomainFixture,
} from "../../mocks/fixtures/createIssue.fixtures.js";

const buildPayloadInput = (overrides = {}) => {
  const {
    allData: allDataOverrides,
    selectedModel: selectedModelOverride,
    ...restOverrides
  } = overrides;
  const selectedModel =
    Object.prototype.hasOwnProperty.call(overrides, "selectedModel")
      ? selectedModelOverride
      : complexCreateIssueModelFixture;

  return {
    allData: {
      issueName: "Budget planning",
      issueDescription: "Detailed issue summary",
      selectedModel,
      isConsensus: selectedModel?.supportsConsensus === true,
      alternatives: createIssueAlternativesFixture,
      criteria: createIssueCriteriaTreeFixture,
      addedExperts: createIssueExpertsFixture,
      expertWeights: createIssueExpertWeightsFixture,
      closureDate: new Date("2026-07-10T00:00:00.000Z"),
      expressionDomainConfig: createIssueGlobalExpressionDomainConfigFixture,
      criteriaWeightingConfig: createIssueManualCriteriaWeightingConfigFixture,
      paramValues: createIssueParamValuesFixture,
      consensusMaxPhases: 4,
      consensusThreshold: 0.8,
      simulateConsensus: true,
      ...allDataOverrides,
    },
    selectedModel,
    modelSupportsConsensusSimulation:
      selectedModel?.supportsConsensusSimulation === true,
    simulateConsensus: true,
    consensusMaxPhases: 4,
    consensusThreshold: 0.8,
    criteria: createIssueCriteriaTreeFixture,
    globalDomains: [globalContinuousDomainFixture],
    expressionDomains: [],
    expressionDomainConfig: createIssueGlobalExpressionDomainConfigFixture,
    criteriaWeightingConfig: createIssueManualCriteriaWeightingConfigFixture,
    expertWeights: createIssueExpertWeightsFixture,
    paramValues: createIssueParamValuesFixture,
    ...restOverrides,
  };
};

describe("createIssuePayload", () => {
  it("builds the expected payload for a valid create-issue request", () => {
    const result = buildCreateIssueRequestPayload(buildPayloadInput());

    expect(result.ok).toBe(true);
    expect(result.payload).toEqual({
      issueName: "Budget planning",
      issueDescription: "Detailed issue summary",
      selectedModel: complexCreateIssueModelFixture,
      selectedModelId: "model-complex",
      isConsensus: true,
      alternatives: createIssueAlternativesFixture,
      criteria: createIssueCriteriaTreeFixture,
      addedExperts: [
        { email: "expert1@example.com", weight: 0.55 },
        { email: "expert2@example.com", weight: 0.45 },
      ],
      closureDate: new Date("2026-07-10T00:00:00.000Z"),
      expressionDomainConfig: createIssueGlobalExpressionDomainConfigFixture,
      criteriaWeightingConfig: createIssueManualCriteriaWeightingConfigFixture,
      paramValues: {
        threshold: 0.6,
        criterionScores: {
          "criterion-cost": 2,
          "criterion-speed": 3,
        },
      },
      consensusMaxPhases: 4,
      consensusThreshold: 0.8,
      simulateConsensus: true,
      criteriaWeightingParameters: {
        source: "manual",
      },
    });
  });

  it("rejects requests without a selected model", () => {
    expect(
      buildCreateIssueRequestPayload(
        buildPayloadInput({
          selectedModel: null,
          allData: { selectedModel: null },
        })
      )
    ).toEqual({
      ok: false,
      errorMessage: "You must select a model before creating the issue.",
    });
  });

  it("rejects requests without alternatives, criteria, or experts", () => {
    expect(
      buildCreateIssueRequestPayload(
        buildPayloadInput({
          allData: { alternatives: [] },
        })
      )
    ).toEqual({
      ok: false,
      errorMessage: "You must add at least one alternative before creating the issue.",
    });

    expect(
      buildCreateIssueRequestPayload(
        buildPayloadInput({
          criteria: [],
          allData: { criteria: [] },
        })
      )
    ).toEqual({
      ok: false,
      errorMessage: "You must define at least one criterion before creating the issue.",
    });

    expect(
      buildCreateIssueRequestPayload(
        buildPayloadInput({
          allData: { addedExperts: [] },
        })
      )
    ).toEqual({
      ok: false,
      errorMessage: "You must select at least one expert before creating the issue.",
    });
  });

  it("rejects invalid expression-domain configuration", () => {
    expect(
      buildCreateIssueRequestPayload(
        buildPayloadInput({
          expressionDomainConfig: { mode: "global", globalDomainId: "missing-domain" },
        })
      )
    ).toEqual({
      ok: false,
      errorMessage:
        "You must assign a compatible expression domain to every leaf criterion before creating the issue.",
    });
  });

  it("rejects invalid criteria-weighting configuration for creator manual mode", () => {
    expect(
      buildCreateIssueRequestPayload(
        buildPayloadInput({
          selectedModel: criteriaWeightModelFixture,
          allData: {
            selectedModel: criteriaWeightModelFixture,
          },
          criteriaWeightingConfig: {
            ...createIssueManualCriteriaWeightingConfigFixture,
            payload: {
              weightsByCriterion: {
                "criterion-cost": 0.2,
                "criterion-speed": 0.2,
              },
            },
          },
        })
      )
    ).toEqual({
      ok: false,
      errorMessage: "Manual weights must sum to 1.",
    });
  });

  it("rejects invalid expert weights", () => {
    expect(
      buildCreateIssueRequestPayload(
        buildPayloadInput({
          expertWeights: {
            "expert1@example.com": -0.5,
            "expert2@example.com": 1.5,
          },
        })
      )
    ).toEqual({
      ok: false,
      errorMessage: "Expert weights must be between 0 and 1.",
    });
  });

  it("rejects invalid consensus settings when the model requires consensus", () => {
    expect(
      buildCreateIssueRequestPayload(
        buildPayloadInput({
          consensusThreshold: 2,
        })
      )
    ).toEqual({
      ok: false,
      errorMessage: "Consensus threshold must be a finite number between 0 and 1.",
    });
  });

  it("keeps simulateConsensus disabled when the model does not support simulation", () => {
    const result = buildCreateIssueRequestPayload(
      buildPayloadInput({
        selectedModel: consensusNoSimulationModelFixture,
        allData: {
          selectedModel: consensusNoSimulationModelFixture,
        },
        criteriaWeightingConfig: null,
      })
    );

    expect(result.ok).toBe(true);
    expect(result.payload.simulateConsensus).toBe(false);
  });

  it("rejects multi-criteria payloads for single-criterion models", () => {
    expect(
      buildCreateIssueRequestPayload(
        buildPayloadInput({
          selectedModel: {
            ...basicCreateIssueModelFixture,
            _id: "model-single-only",
            isMultiCriteria: false,
          },
          allData: {
            selectedModel: {
              ...basicCreateIssueModelFixture,
              _id: "model-single-only",
              isMultiCriteria: false,
            },
          },
          criteriaWeightingConfig: null,
          expertWeights: null,
        })
      )
    ).toEqual({
      ok: false,
      errorMessage: "This model does not support multiple criteria.",
    });
  });
});
