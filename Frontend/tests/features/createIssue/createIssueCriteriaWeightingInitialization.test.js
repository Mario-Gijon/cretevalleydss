import { describe, expect, it, vi } from "vitest";

import {
  buildCriteriaWeightingDecisionContext,
  buildCriteriaWeightingInitializationIdentity,
  buildCreatorCriteriaWeightingInitialization,
} from "../../../src/features/createIssue/logic/createIssueCriteriaWeightingInitialization.js";
import { bestWorstCriteriaStructure } from "../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/index.js";
import { buildDecisionContext } from "../../../src/features/issueEvaluation/logic/buildDecisionContext.js";

const bwmModel = {
  _id: "bwm-model",
  apiModelKey: "bwm",
  name: "BWM",
  evaluationStructureKey: "bestWorstCriteria",
};
const leafCriteria = [
  { id: "criterion-a", name: "Cost", children: [] },
  { id: "criterion-b", name: "Quality", children: [] },
];

const buildContext = (criteria = leafCriteria) =>
  buildCriteriaWeightingDecisionContext({
    criteriaWeightingModel: bwmModel,
    structureEntry: bestWorstCriteriaStructure,
    criteriaTree: criteria,
    leafCriteria: criteria,
  });

describe("Create Issue criteria-weighting initialization", () => {
  it("builds the shared canonical decision context and canonical BWM payload", () => {
    const decisionContext = buildContext();
    const initialization = buildCreatorCriteriaWeightingInitialization({
      criteriaWeightingModel: bwmModel,
      structureEntry: bestWorstCriteriaStructure,
      decisionContext,
    });

    expect(decisionContext).toMatchObject({
      issue: {
        id: null,
        name: null,
        currentStage: "criteriaWeighting",
        consensusPhase: 0,
      },
      structure: {
        key: "bestWorstCriteria",
        stage: "criteriaWeighting",
      },
      alternatives: [],
      experts: [],
      criteriaWeights: {},
      expertWeights: {},
      consensus: {
        phase: 0,
        currentCollectiveEvaluations: {},
        previousCollectiveEvaluations: {},
      },
    });
    expect(initialization.evaluation).toEqual({
      bestCriterionId: "",
      worstCriterionId: "",
      bestToOthers: {
        "criterion-a": "",
        "criterion-b": "",
      },
      othersToWorst: {
        "criterion-a": "",
        "criterion-b": "",
      },
    });
  });

  it("keeps the same decision-context shape before and after issue creation", () => {
    const creatorContext = buildContext();
    const persistedContext = buildDecisionContext({
      issue: {
        id: "persisted-issue",
        name: "Persisted issue",
        currentStage: "criteriaWeighting",
        consensusPhase: 0,
      },
      stage: "criteriaWeighting",
      structure: bestWorstCriteriaStructure,
      model: bwmModel,
      parameters: {
        modelParameters: {},
        criteriaWeightingParameters: {},
      },
      alternatives: [],
      criteriaTree: leafCriteria,
      leafCriteria,
    });

    expect(Object.keys(creatorContext)).toEqual(Object.keys(persistedContext));
    expect(Object.keys(creatorContext.issue)).toEqual(
      Object.keys(persistedContext.issue)
    );
    expect(Object.keys(creatorContext.consensus)).toEqual(
      Object.keys(persistedContext.consensus)
    );
    expect(creatorContext.leafCriteria).toEqual(
      persistedContext.leafCriteria
    );
    expect(creatorContext.issue.id).toBeNull();
    expect(persistedContext.issue.id).toBe("persisted-issue");
  });

  it("uses model, structure, and ordered leaf ids as the reset identity", () => {
    const initialIdentity = buildCriteriaWeightingInitializationIdentity({
      criteriaWeightingModel: bwmModel,
      structureEntry: bestWorstCriteriaStructure,
      decisionContext: buildContext(),
    });
    const renamedIdentity = buildCriteriaWeightingInitializationIdentity({
      criteriaWeightingModel: bwmModel,
      structureEntry: bestWorstCriteriaStructure,
      decisionContext: buildContext([
        { ...leafCriteria[0], name: "Renamed cost" },
        leafCriteria[1],
      ]),
    });
    const addedIdentity = buildCriteriaWeightingInitializationIdentity({
      criteriaWeightingModel: bwmModel,
      structureEntry: bestWorstCriteriaStructure,
      decisionContext: buildContext([
        ...leafCriteria,
        { id: "criterion-c", name: "Delivery", children: [] },
      ]),
    });
    const removedIdentity = buildCriteriaWeightingInitializationIdentity({
      criteriaWeightingModel: bwmModel,
      structureEntry: bestWorstCriteriaStructure,
      decisionContext: buildContext([leafCriteria[0]]),
    });
    const switchedModelIdentity =
      buildCriteriaWeightingInitializationIdentity({
        criteriaWeightingModel: { ...bwmModel, _id: "other-model" },
        structureEntry: bestWorstCriteriaStructure,
        decisionContext: buildContext(),
      });

    expect(renamedIdentity).toBe(initialIdentity);
    expect(addedIdentity).not.toBe(initialIdentity);
    expect(removedIdentity).not.toBe(initialIdentity);
    expect(switchedModelIdentity).not.toBe(initialIdentity);
  });

  it("rejects creator structures without both required capabilities", () => {
    expect(() =>
      buildCreatorCriteriaWeightingInitialization({
        criteriaWeightingModel: bwmModel,
        structureEntry: {
          key: "missingInitializer",
          View: vi.fn(),
        },
        decisionContext: buildContext(),
      })
    ).toThrow("cannot initialize creator-side evaluation");
  });
});
