import { describe, expect, it } from "vitest";

import { buildEvaluationContext } from "../../../src/features/issueEvaluation/logic/buildEvaluationContext.js";
import { extractLeafCriteria } from "../../../src/features/issueEvaluation/logic/extractIssueEvaluationLeafCriteria.js";
import { EVALUATION_STAGES } from "../../../src/features/decisionPlugins/evaluations/evaluationStages.js";
import {
  evaluationIssueFixture,
  evaluationIssueWithUnderscoreIdFixture,
} from "../../mocks/fixtures/evaluation.fixtures.js";

describe("buildEvaluationContext", () => {
  it("builds a stable context from a complete issue", () => {
    const context = buildEvaluationContext({
      issue: evaluationIssueFixture,
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
      criteriaWeightingParameters: {},
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
    expect(context.criteriaTree).toHaveLength(1);
    expect(context.leafCriteria).toEqual([
      {
        id: "criterion-cost",
        name: "Cost",
        type: "cost",
        expressionDomain: {
          id: "domain-cost",
          name: "0-10",
          type: "numeric",
          numericRange: { min: 0, max: 10, step: 1 },
        },
      },
      {
        id: "criterion-quality",
        name: "Quality",
        type: "benefit",
        expressionDomain: {
          id: "domain-quality",
          name: "Low/Medium/High",
          type: "linguistic",
        },
      },
    ]);
  });

  it("accepts issue._id when issue.id is missing", () => {
    const context = buildEvaluationContext({
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
    const context = buildEvaluationContext({
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
          type: "numeric",
          numericRange: { min: 0, max: 10, step: 1 },
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
          type: "linguistic",
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

    const context = buildEvaluationContext({
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
