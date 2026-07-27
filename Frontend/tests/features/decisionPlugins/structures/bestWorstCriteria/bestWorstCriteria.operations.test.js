import { describe, expect, it } from "vitest";

import { buildInitialEvaluation } from "../../../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/operations/buildInitialEvaluation.js";
import { resolveCollective } from "../../../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/operations/resolveCollective.js";
import { resolveCriteria } from "../../../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/operations/resolveCriteria.js";
import { updateComparison } from "../../../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/operations/updateComparison.js";
import { updateSelection } from "../../../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/operations/updateSelection.js";
import { validateEvaluation } from "../../../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/operations/validateEvaluation.js";

const criteria = [
  { id: "quality", name: "Quality", index: 0 },
  { id: "cost", name: "Cost", index: 1 },
  { id: "delivery", name: "Delivery", index: 2 },
];

const emptyEvaluation = {
  bestCriterionId: "",
  worstCriterionId: "",
  bestToOthers: { quality: "", cost: "", delivery: "" },
  othersToWorst: { quality: "", cost: "", delivery: "" },
};

const completeEvaluation = {
  bestCriterionId: "quality",
  worstCriterionId: "cost",
  bestToOthers: { quality: 1, cost: 5, delivery: 3 },
  othersToWorst: { quality: 5, cost: 1, delivery: 3 },
};

describe("bestWorstCriteria operations", () => {
  it("resolves canonical criteria and initializes every leaf without selections", () => {
    const decisionContext = {
      issue: {
        id: null,
        name: null,
        currentStage: "criteriaWeighting",
      },
      alternatives: [],
      leafCriteria: criteria.map(({ id, name }) => ({ id, name })),
      consensus: {
        phase: 0,
        currentCollectiveEvaluations: {},
        previousCollectiveEvaluations: {},
      },
    };

    expect(
      resolveCriteria({
        decisionContext,
      })
    ).toEqual(criteria);
    expect(buildInitialEvaluation({ decisionContext })).toEqual(emptyEvaluation);
    expect(buildInitialEvaluation({ decisionContext }).bestCriterionId).toBe("");
    expect(buildInitialEvaluation({ decisionContext }).worstCriterionId).toBe("");
    expect(Object.keys(buildInitialEvaluation({ decisionContext }).bestToOthers))
      .toEqual(criteria.map((criterion) => criterion.id));
  });

  it("rejects malformed creator-side criteria", () => {
    expect(() =>
      buildInitialEvaluation({
        decisionContext: {
          issue: { id: null },
          leafCriteria: [
            { id: "duplicate", name: "First" },
            { id: "duplicate", name: "Second" },
          ],
        },
      })
    ).toThrow('criterion id "duplicate" is duplicated');
  });

  it("validates canonical state and rejects legacy or partial payloads", () => {
    expect(
      validateEvaluation({ criteria, evaluation: completeEvaluation })
    ).toBe(completeEvaluation);

    expect(() =>
      validateEvaluation({
        criteria,
        evaluation: {
          ...completeEvaluation,
          bestCriterion: "quality",
        },
      })
    ).toThrow("invalid top-level shape");

    expect(() =>
      validateEvaluation({
        criteria,
        evaluation: {
          ...completeEvaluation,
          worstCriterion: "cost",
        },
      })
    ).toThrow("invalid top-level shape");

    const partial = structuredClone(completeEvaluation);
    delete partial.bestToOthers.delivery;
    expect(() =>
      validateEvaluation({ criteria, evaluation: partial })
    ).toThrow("must contain exactly all leaf criteria");
  });

  it("resets the entire selected vector and preserves the opposite vector", () => {
    const nextBest = updateSelection({
      evaluation: completeEvaluation,
      criteria,
      selection: "best",
      criterionId: "delivery",
    });
    const nextWorst = updateSelection({
      evaluation: completeEvaluation,
      criteria,
      selection: "worst",
      criterionId: "delivery",
    });

    expect(nextBest).toEqual({
      ...completeEvaluation,
      bestCriterionId: "delivery",
      bestToOthers: { quality: "", cost: "", delivery: 1 },
    });
    expect(nextWorst).toEqual({
      ...completeEvaluation,
      worstCriterionId: "delivery",
      othersToWorst: { quality: "", cost: "", delivery: 1 },
    });
    expect(completeEvaluation.bestToOthers).toEqual({
      quality: 1,
      cost: 5,
      delivery: 3,
    });
  });

  it("clears complete vectors and rejects conflicts", () => {
    expect(
      updateSelection({
        evaluation: completeEvaluation,
        criteria,
        selection: "best",
        criterionId: "",
      })
    ).toEqual({
      ...completeEvaluation,
      bestCriterionId: "",
      bestToOthers: { quality: "", cost: "", delivery: "" },
    });
    expect(
      updateSelection({
        evaluation: completeEvaluation,
        criteria,
        selection: "worst",
        criterionId: "",
      })
    ).toEqual({
      ...completeEvaluation,
      worstCriterionId: "",
      othersToWorst: { quality: "", cost: "", delivery: "" },
    });

    expect(() =>
      updateSelection({
        evaluation: completeEvaluation,
        criteria,
        selection: "best",
        criterionId: "cost",
      })
    ).toThrow("must be different");
  });

  it("allows the same selection for a single criterion", () => {
    const singleCriteria = [{ id: "only", name: "Only", index: 0 }];
    const selectedBest = updateSelection({
      evaluation: {
        bestCriterionId: "",
        worstCriterionId: "only",
        bestToOthers: { only: "" },
        othersToWorst: { only: 1 },
      },
      criteria: singleCriteria,
      selection: "best",
      criterionId: "only",
    });

    expect(selectedBest).toEqual({
      bestCriterionId: "only",
      worstCriterionId: "only",
      bestToOthers: { only: 1 },
      othersToWorst: { only: 1 },
    });
  });

  it("updates 1-9 comparisons immutably and rejects invalid edits", () => {
    const updated = updateComparison({
      evaluation: completeEvaluation,
      criteria,
      comparison: "bestToOthers",
      criterionId: "cost",
      value: "7",
    });

    expect(updated.bestToOthers.cost).toBe(7);
    expect(completeEvaluation.bestToOthers.cost).toBe(5);
    expect(
      updateComparison({
        evaluation: completeEvaluation,
        criteria,
        comparison: "bestToOthers",
        criterionId: "cost",
        value: "10",
      })
    ).toBe(completeEvaluation);
    expect(() =>
      updateComparison({
        evaluation: completeEvaluation,
        criteria,
        comparison: "bestToOthers",
        criterionId: "quality",
        value: "2",
      })
    ).toThrow("cannot be edited");
  });

  it("resolves normalized collective weights and rejects invalid totals", () => {
    const collectiveEvaluation = {
      weightsByCriterion: {
        quality: 0.6,
        cost: 0.25,
        delivery: 0.15,
      },
    };

    expect(
      resolveCollective({ criteria, collectiveEvaluation })
    ).toBe(collectiveEvaluation);
    expect(
      resolveCollective({ criteria, collectiveEvaluation: null })
    ).toBeNull();
    expect(() =>
      resolveCollective({
        criteria,
        collectiveEvaluation: {
          weightsByCriterion: {
            quality: 0.6,
            cost: 0.25,
            delivery: 0.2,
          },
        },
      })
    ).toThrow("must sum to 1");
  });

  it("rejects populated vectors without a corresponding selection", () => {
    const invalidEvaluation = structuredClone(emptyEvaluation);
    invalidEvaluation.bestToOthers.quality = 3;

    expect(() =>
      validateEvaluation({ criteria, evaluation: invalidEvaluation })
    ).toThrow("must be empty without a selection");
  });
});
