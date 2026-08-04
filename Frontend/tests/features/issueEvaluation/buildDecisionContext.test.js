import { describe, expect, it } from "vitest";

import { EVALUATION_STAGES } from "../../../src/features/decisionPlugins/evaluations";
import { buildDecisionContext } from "../../../src/features/issueEvaluation/logic/buildDecisionContext.js";
import { extractLeafCriteria } from "../../../src/features/issueEvaluation/logic/extractIssueEvaluationLeafCriteria.js";
import {
  evaluationIssueFixture,
  evaluationIssueWithUnderscoreIdFixture,
} from "../../mocks/fixtures/evaluation.fixtures.js";

describe("buildDecisionContext", () => {
  it("builds a stable context from a complete issue", () => {
    const context = buildDecisionContext({
      issue: {
        ...evaluationIssueFixture,
        criteriaWeightingParameters: { aggregation: "mean" },
      },
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      structure: {
        key: "alternativeCriteriaMatrix",
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      },
    });

    expect(context).toMatchObject({
      issue: {
        id: "issue-eval-1",
        name: "Budget Planning",
        currentStage: "alternativeEvaluation",
        consensusPhase: 2,
        consensusMaxPhases: 5,
        consensusThreshold: 0.75,
        isConsensus: true,
      },
      structure: {
        key: "alternativeCriteriaMatrix",
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      },
      model: {
        id: "model-1",
        name: "AHP",
        apiModelKey: "ahp",
      },
      modelParameters: {
        alpha: 0.4,
      },
      criteriaWeightingParameters: {
        aggregation: "mean",
      },
      alternatives: [
        { id: "alt-1", name: "Option A" },
        { id: "alt-2", name: "Option B" },
      ],
      consensus: {
        phase: 2,
        maxPhases: 5,
        threshold: 0.75,
      },
    });
    expect(Object.keys(context)).toEqual([
      "issue",
      "structure",
      "model",
      "modelParameters",
      "criteriaWeightingParameters",
      "alternatives",
      "criteriaTree",
      "leafCriteria",
      "experts",
      "criteriaWeights",
      "expertWeights",
      "consensus",
    ]);
    expect(context.criteriaTree).toHaveLength(1);
    expect(context.leafCriteria).toEqual([
      {
        id: "criterion-cost",
        name: "Cost",
        type: "cost",
        expressionDomain: {
          id: "domain-cost",
          name: "0-10",
          typeKey: "numericDiscrete",
          definition: {
            min: 0,
            max: 10,
            step: 1,
          },
        },
      },
      {
        id: "criterion-quality",
        name: "Quality",
        type: "benefit",
        expressionDomain: {
          id: "domain-quality",
          name: "Low/Medium/High",
          typeKey: "linguisticOrdinal",
          definition: {
            labels: [
              { key: "low", label: "Low", index: 0 },
              { key: "medium", label: "Medium", index: 1 },
              { key: "high", label: "High", index: 2 },
            ],
          },
        },
      },
    ]);
  });

  it("accepts issue._id when issue.id is missing", () => {
    const context = buildDecisionContext({
      issue: evaluationIssueWithUnderscoreIdFixture,
      stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      structure: {
        key: "manualCriteriaWeights",
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      },
    });

    expect(context.issue.id).toBe("issue-eval-underscore");
  });

  it("normalizes missing and malformed fields to safe defaults", () => {
    const context = buildDecisionContext({
      issue: {
        id: "",
        name: "",
        alternatives: [null, "bad"],
        criteria: null,
        consensusPhase: "2",
        consensusMaxPhases: "5",
        consensusThreshold: "0.7",
        parameters: [],
      },
      stage: null,
      structure: {},
      parameters: {
        modelParameters: [],
        criteriaWeightingParameters: "bad",
      },
      alternatives: null,
      criteriaTree: null,
      leafCriteria: null,
    });

    expect(context).toMatchObject({
      issue: {
        id: null,
        name: null,
        currentStage: null,
        consensusPhase: null,
        consensusMaxPhases: null,
        consensusThreshold: null,
        isConsensus: false,
      },
      structure: {
        key: null,
        stage: null,
      },
      model: null,
      modelParameters: {},
      criteriaWeightingParameters: {},
      alternatives: [],
      criteriaTree: [],
      leafCriteria: [],
      experts: [],
      criteriaWeights: {},
      expertWeights: {},
    });
  });

  it("builds an unpersisted creation context from local form state", () => {
    const context = buildDecisionContext({
      issue: {
        id: null,
        name: "Local draft",
        currentStage: "criteriaWeighting",
        consensusPhase: 0,
        isConsensus: false,
      },
      stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      structure: {
        key: "manualCriteriaWeights",
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      },
      model: { id: "weight-model", name: "Weight model", apiModelKey: "weights" },
      parameters: {
        modelParameters: { alpha: 0.5 },
        criteriaWeightingParameters: { method: "mean" },
      },
      alternatives: [
        { id: "second", name: "Second" },
        { id: "first", name: "First" },
      ],
      criteriaTree: evaluationIssueFixture.criteria,
      experts: [
        { id: "expert-2", name: "Expert Two", email: "private@example.test" },
        { id: "expert-1", name: "Expert One" },
      ],
      criteriaWeights: { "criterion-cost": 0 },
      expertWeights: { "expert-2": 0, "expert-1": 1 },
      currentCollectiveEvaluations: { current: true },
      previousCollectiveEvaluations: { previous: true },
    });

    expect(context.issue.id).toBeNull();
    expect(context.alternatives.map((item) => item.id)).toEqual(["second", "first"]);
    expect(context.leafCriteria.map((item) => item.id)).toEqual([
      "criterion-cost",
      "criterion-quality",
    ]);
    expect(context.experts).toEqual([
      { id: "expert-2", name: "Expert Two" },
      { id: "expert-1", name: "Expert One" },
    ]);
    expect(context.criteriaWeights).toEqual({ "criterion-cost": 0 });
    expect(context.expertWeights).toEqual({ "expert-2": 0, "expert-1": 1 });
    expect(context.modelParameters).toEqual({ alpha: 0.5 });
    expect(context.criteriaWeightingParameters).toEqual({ method: "mean" });
    expect(context.consensus).toMatchObject({
      phase: 0,
      currentCollectiveEvaluations: { current: true },
      previousCollectiveEvaluations: { previous: true },
    });
  });

  it("extracts nested leaf criteria and preserves expression domains", () => {
    expect(extractLeafCriteria(evaluationIssueFixture.criteria)).toEqual([
      {
        id: "criterion-cost",
        name: "Cost",
        type: "cost",
        expressionDomain: {
          id: "domain-cost",
          name: "0-10",
          typeKey: "numericDiscrete",
          definition: {
            min: 0,
            max: 10,
            step: 1,
          },
        },
        children: [],
        path: ["Impact", "Cost"],
      },
      {
        id: "criterion-quality",
        name: "Quality",
        type: "benefit",
        expressionDomain: {
          id: "domain-quality",
          name: "Low/Medium/High",
          typeKey: "linguisticOrdinal",
          definition: {
            labels: [
              { key: "low", label: "Low", index: 0 },
              { key: "medium", label: "Medium", index: 1 },
              { key: "high", label: "High", index: 2 },
            ],
          },
        },
        children: [],
        path: ["Impact", "Quality"],
      },
    ]);
  });

  it("handles malformed criteria and leaf inputs without crashing", () => {
    expect(extractLeafCriteria(null)).toEqual([]);
    expect(extractLeafCriteria([{ name: "Missing children" }, null])).toEqual([
      {
        name: "Missing children",
        path: ["Missing children"],
      },
    ]);

    const context = buildDecisionContext({
      issue: evaluationIssueFixture,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      structure: {
        key: "alternativeCriteriaMatrix",
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      },
      alternatives: null,
      criteriaTree: "bad",
      leafCriteria: "bad",
      parameters: null,
    });

    expect(context.alternatives).toEqual([
      { id: "alt-1", name: "Option A" },
      { id: "alt-2", name: "Option B" },
    ]);
    expect(context.criteriaTree).toHaveLength(1);
    expect(context.leafCriteria).toHaveLength(2);
  });
});
